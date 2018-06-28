# About

!!! warning
    This project is currenty in beta, and while we're confident that it's awesome it's certainly not production ready!

## Motivation

Unbundled projects, specifically those that are leveraging Web Components, suffer from some interesting cacheing obstacles. The toughest
being that you can't aggressively cache imports, as lookup paths aren't updated when dependencies are updated, and this has been a key
downside holding back the wide adoption of unbundled code distrubution. Another issue haunting some frontend developers, that doesn't only
affect unbundled projects but mostly pokes it's ugly head into Bower managed projects, is poor dependency resolution.

The two issues outlined above are the inspiration behind WCM. Web applications need a reliable tool to organise their dependencies that
also complements the environment that they run in.

## Solution

The issue approaching the above challenges with conventional package managers lies in the way that they store their dependencies. When
installing a package via NPM, Yarn, or Bower, that package is store locally under it's unique package name. Whilst there is nothing wrong
with this approach, it doesn't complement web applications.

Over the past decades most websites and Progressive Web Applications will have imported some code from a CDN. Packages are organised a
little differently in a CDN, they're subgrouped by a version number, and it's only with this extra level of specificity that a CDN can
aggresively cache packages. WCM copies this organisational strucutre when installing your dependencies, enabling you to work against a
CDN-like interface with all of the benefits that they bring to the table.

Having your dependencies organised in a way that objectively better suits web applications is all well and good, however, a change in the
structure of a project's dependencies would call for a change in the way those dependencies are referenced. Ouch! Fear not though, WCM is
backwards compatible with today's methods, it actually prefers them, so you won't need to change a single import statement.

Through the wonders of Service Workers, WCM emulates a reverse proxy within the client's browser that fetches the exact version of each
dependency as and when it's requested.
