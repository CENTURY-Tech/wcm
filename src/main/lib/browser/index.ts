import * as Vorpal from "vorpal";
import { GlobalConfig } from "../config";
import { writeFile } from "fs-extra";
import { transform } from "babel-core";
import { ConfigReader } from "../../util";
import { BrowserConfig } from "./config";

export default function(vorpal: Vorpal) {
  vorpal
    .command("browser init", "Prepare the Service Worker impl/reg files")
    .action(async function(this: Vorpal.CommandInstance, args: Vorpal.Args) {
      return Promise.all([
        createWorkerImplCode()
          .map(_ => writeFile("wcm-impl.js", _))
          .run(GlobalConfig.browser.getOrCreateInstance()),
        createWorkerRegCode()
          .map(_ => writeFile("wcm-reg.js", _))
          .run(GlobalConfig.browser.getOrCreateInstance())
      ]).then(() => void null);
    });
}

export function createWorkerImplCode(): ConfigReader<BrowserConfig, string> {
  return ConfigReader(config => {
    const workerImpl = transform(
      `
      ${ReverseProxy.toString()}
      const proxy = (new ReverseProxy("${config.get("interceptSrc")}", "${config.get("interceptDest")}"))
      proxy.setup()
      `,
      config.get("babelTransformOptions")
    );

    return workerImpl.code || "";
  });
}

export function createWorkerRegCode(): ConfigReader<BrowserConfig, string> {
  return ConfigReader(config => {
    const workerReg = transform(
      `
      window.WCM = {
        bootstrap() {
          if (!('serviceWorker' in navigator)) {
            ${config.get("enableLegacySupport") ? "return Promise.reject(" : "throw Error("}'Service Workers not supported');
          }

          if (!('fetch' in window)) {
            ${config.get("enableLegacySupport") ? "return Promise.reject(" : "throw Error("}'Fetch not supported');
          }

          return navigator.serviceWorker.register('./wcm-impl.js')
            .then(() => {
              ${config.get("enableOverrideSupport") ? `
              if (localStorage.getItem('wcm.overrideEnabled')) {
                console.warn('WCM override enabled!');
                return Promise.resolve();
              }
              ` : ""}
              return fetch('./manifest.json').then(response => {
                return response.json().then(this.setManifest);
              });
            });
        },

        getManifest() {
          return wcmPostMessage("getManifest");
        },

        setManifest(manifest) {
          return wcmPostMessage("setManifest", manifest);
        },

        flushCache() {
          return wcmPostMessage("flushCache");
        },

        loadable(obj, tagname) {
          const elem = document.createElement(tagname);

          Object.keys(obj).map(key => {
            elem.setAttribute(key, obj[key]);
          });

          return new Promise(resolve => {
            elem.onload = resolve;
            document.body.appendChild(elem);
          });
        },
        ${config.get("enableOverrideSupport") ? `
        useOverride(manifest) {
          localStorage.setItem("wcm.overrideEnabled", true);
          return wcmPostMessage("setManifest", manifest);
        },

        disableOverride() {
          localStorage.removeItem('wcm.overrideEnabled');
        },` : ""}
      }

      function wcmPostMessage(command, data) {
        return new Promise((resolve, reject) => {
          const messageChannel = new MessageChannel();

          messageChannel.port1.onmessage = ({ data }) => {
            if (data.error) {
              reject(data.error);
            } else {
              resolve(data);
            }
          };

          navigator.serviceWorker.controller.postMessage({ command, data }, [messageChannel.port2]);
        });
      }
    `,
      config.get("babelTransformOptions")
    );

    return workerReg.code || "";
  });
}

export class ReverseProxy {
  constructor(
    public interceptSrc: string,
    public interceptDest: string,
    public objectStore = ReverseProxy.getOrCreateStore()
  ) {}

  public setup() {
    self.addEventListener("install", this.handleInstallEvent);
    self.addEventListener("activate", this.handleActivateEvent);
    self.addEventListener("fetch", this.handleFetchEvent);
    self.addEventListener("message", this.handleMessageEvent);
  }

  public teardown() {
    self.removeEventListener("install", this.handleInstallEvent);
    self.removeEventListener("activate", this.handleActivateEvent);
    self.removeEventListener("fetch", this.handleFetchEvent);
    self.removeEventListener("message", this.handleMessageEvent);
  }

  public getManifest(): Promise<object> {
    return this.objectStore.then(store => {
      return store.get("manifest");
    });
  }

  public setManifest(manifest: object): Promise<void> {
    return this.objectStore.then(store => {
      return store.set("manifest", manifest);
    });
  }

  public flushCache(): Promise<boolean> {
    return caches.delete("wcm");
  }

  private handleInstallEvent(event: any): void {
    event.waitUntil((self as any).skipWaiting());
  }

  private handleActivateEvent(event: any): void {
    event.waitUntil((self as any).clients.claim());
  }

  private handleFetchEvent = function(this: ReverseProxy, event: any): void {
    if (!event.request.url.match(new RegExp(this.interceptSrc, "g"))) {
      return;
    }

    event.respondWith(this.getManifest().then((manifest: any) => {
      if (!manifest) {
        return fetch(event.request);
      }

      return caches.open("wcm").then(cache => {
        const { development, opaque, versionedUrl } = ReverseProxy.resolveUrlObject(new URL(event.request.url), manifest, this)
        const request = development ? event.request : new Request(versionedUrl, event.request);

        return development
          ? fetch(request.url)
          : cache.match(request).then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            } else {
              return fetch(request.url).then(networkResponse => {
                if (opaque) {
                  networkResponse = new Response(networkResponse.body as any, {
                    status: networkResponse.status,
                    statusText: networkResponse.statusText,
                    headers: networkResponse.headers,
                  });
                }

                if (networkResponse.ok) {
                  cache.put(request, networkResponse.clone());
                }

                return networkResponse;
              });
            }
          });
      });
    }));
  }.bind(this);

  private handleMessageEvent = function(this: ReverseProxy, event: any): any {
    switch (event.data.command) {
      case "getManifest":
        return this.getManifest().then((res) => event.ports[0].postMessage(res));

      case "setManifest":
        return this.setManifest(event.data.data).then((res) => event.ports[0].postMessage(res));

      case "flushCache":
        return this.flushCache().then((res) => event.ports[0].postMessage(res));

      default:
        event.ports[0].postMessage(Error(`Unknown command: "${event.data.command}"`));
    }
  }.bind(this);

  public static getOrCreateStore() {
    return new Promise((resolve, reject) => {
      const openreq = indexedDB.open("wcm_db", 1);

      openreq.onerror = () => reject(openreq.error);
      openreq.onsuccess = () => resolve(openreq.result);

      openreq.onupgradeneeded = () => {
        openreq.result.createObjectStore("wcm_keyval");
      };
    }).then((db: any) => ({
      get: <T>(key: IDBValidKey): Promise<T> => {
        return createTransaction(db, store => store.get(key));
      },
      set: (key: IDBValidKey, value: any): Promise<void> => {
        return createTransaction(db, store => store.put(value, key));
      }
    }));

    function createTransaction(db: IDBDatabase, interaction: (objectStore: IDBObjectStore) => IDBRequest): Promise<any> {
      return new Promise((resolve, reject) => {
        let objectStoreRequest: IDBRequest;
        const transaction = db.transaction("wcm_keyval", "readwrite");

        transaction.oncomplete = () => resolve(objectStoreRequest.result);
        transaction.onabort = transaction.onerror = () => reject(transaction.error);

        objectStoreRequest = interaction(transaction.objectStore("wcm_keyval")) as IDBRequest;
      });
    }
  }

  public static resolveUrlObject(url: URL, manifest: any, config: Record<"interceptSrc" | "interceptDest", string>): { development: boolean, opaque: boolean, versionedUrl: string } {
    return {
      ...ReverseProxy.resolveUrl(url.pathname, manifest, config),
      opaque: !!url.searchParams.get("wcm-opaque"),
    }
  }

  public static resolveUrl(pathname: string, manifest: any, { interceptSrc, interceptDest }: Record<"interceptSrc" | "interceptDest", string>): { development: boolean, versionedUrl: string } {
    let development: boolean = false;
    let versionedUrl: string = pathname;

    if (pathname.includes(interceptSrc)) {
      const index = pathname.indexOf(interceptSrc);

      if (index > -1) {
        let [, dependencyScope, dependencyName, ...dependencyLookup] = pathname.slice(index).split("/");

        if (!dependencyScope.startsWith("@")) {
          dependencyLookup.unshift(dependencyName);
          dependencyName = dependencyScope;
        } else {
          dependencyName = `${dependencyScope}/${dependencyName}`;
        }

        const version = manifest[dependencyName];

        switch (version) {
          case "development":
            development = true;
          default:
            versionedUrl = [interceptDest, dependencyName, version, ...dependencyLookup].join("/");
        }
      }
    }

    return { development, versionedUrl };
  }
}
