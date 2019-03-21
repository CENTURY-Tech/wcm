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
      if ('serviceWorker' in navigator && 'fetch' in window) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          return Promise.all(registrations.map(registration => {
            return registration.unregister();
          }));
        })
        .then(() => {
          return navigator.serviceWorker.register('./wcm-impl.js');
        })
        .then(() => {
          return fetch('./manifest.json').then(response => {
            response.json().then(manifest => {
              fetch('/wcm/manifest', {
                method: 'POST',
                body: JSON.stringify(manifest),
                headers: {
                  'content-type': 'application/json'
                }
              });
            });
          });
        })
        .then(() => {
          window.dispatchEvent(new CustomEvent('WCMLoaded'));
        })
        .catch(err => {
          console.log('Registration failed: %s', err);
        });
      } else {
        console.warn("Service workers not supported!")
      }

      function loadable(obj, tagname) {
        const elem = document.createElement(tagname);
      
        Object.keys(obj).map(key => {
          elem.setAttribute(key, obj[key]);
        });
      
        return new Promise(resolve => {
          elem.onload = resolve;
          document.body.appendChild(elem);
        });
      }
    `,
      config.get("babelTransformOptions")
    );

    return workerReg.code || "";
  });
}

interface ProxyEndpoints {
  matcher(this: ReverseProxy, event: any): boolean;
  handler(this: ReverseProxy, event: any): void;
}

export class ReverseProxy {
  public endpoints: ProxyEndpoints[] = [
    {
      matcher: (event: any) => {
        return new URL(event.request.url).pathname === "/wcm/manifest" && event.request.method === "POST";
      },
      handler: (event: any) => {
        event.respondWith(
          event.request.json().then((manifest: any) => {
            return this.setManifest(manifest).then(() => new Response());
          })
        );
      }
    },
    {
      matcher: (event: any) => {
        return new URL(event.request.url).pathname === "/wcm/flush" && event.request.method === "POST";
      },
      handler: (event: any) => {
        event.respondWith(caches.delete("wcm").then(() => new Response()));
      }
    },
    {
      matcher: (event: any) => {
        return event.request.url.match(new RegExp(this.interceptSrc, "g"));
      },
      handler: function(event: any) {
        event.respondWith(
          this.getManifest().then((manifest: any) => {
            if (!manifest) {
              return fetch(event.request);
            }

            return caches.open("wcm").then(cache => {
              const { development, versionedUrl } = ReverseProxy.resolveUrl(new URL(event.request.url).pathname, manifest, this)
              const request = new Request(versionedUrl, event.request);

              return development
                ? fetch(request.url)
                : cache.match(request).then(cachedResponse => {
                  if (cachedResponse) {
                    return cachedResponse;
                  } else {
                    return fetch(request.url).then(networkResponse => {
                      cache.put(request, networkResponse.clone());
                      return networkResponse;
                    });
                  }
                });
            });
          })
        );
      }
    }
  ];

  constructor(
    public interceptSrc: string,
    public interceptDest: string,
    public objectStore = ReverseProxy.getOrCreateStore()
  ) {}

  public setup() {
    self.addEventListener("install", this.handleInstallEvent);
    self.addEventListener("activate", this.handleActivateEvent);
    self.addEventListener("fetch", this.handleFetchEvent);
  }

  public teardown() {
    self.removeEventListener("install", this.handleInstallEvent);
    self.removeEventListener("activate", this.handleActivateEvent);
    self.removeEventListener("fetch", this.handleFetchEvent);
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

  private handleInstallEvent(event: any): void {
    (self as any).skipWaiting();
  }

  private handleActivateEvent(event: any): void {
    event.waitUntil((self as any).clients.claim());
  }

  private handleFetchEvent = function(this: ReverseProxy, event: any): void {
    for (var i = 0, n = this.endpoints.length; i < n; i++) {
      if (this.endpoints[i].matcher.call(this, event)) {
        return this.endpoints[i].handler.call(this, event);
      }
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

  public static resolveUrl(pathname: string, manifest: any, { interceptSrc, interceptDest }: Record<"interceptSrc" | "interceptDest", string>): { development: boolean, versionedUrl: string } {
    let development: boolean = false;
    let versionedUrl: string = pathname;

    if (pathname.includes(interceptSrc)) {
      const index = pathname.indexOf(interceptSrc);

      if (index > -1) {
        const [, dependencyName, ...dependencyLookup] = pathname.slice(index).split("/");

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
