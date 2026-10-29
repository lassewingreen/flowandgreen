# The Flow and Green — redesign notes

Prepared 29 October 2026. This is a static, GitHub Pages compatible redesign of the existing Danish website. Original assets remain available. The existing Formspree endpoint is retained. No calendar sync has been configured, and no enquiries were submitted during verification.

## Design research

- [D&L Acoustic Duo](https://www.dlacousticduo.co.uk/): distinctive identity, immediate performance examples and personal introduction. Takeaway: let the actual music and musicians do the selling.
- [Kaleidos](https://www.kaleidos.uk/acoustic): packages organised around the wedding day. Takeaway: help couples identify which moments they want music for.
- [Han & Stu](https://www.hanandstumusic.com/): clear ceremony-to-party positioning. Takeaway: explain the range of the experience rather than only listing instruments.

These are relevant references, not an objective ranking of the best sites. No conversion uplift has been measured.

## Contact recommendation

Keep Formspree initially. It already works with the static site; the interface can be completely redesigned independently. The new form uses an AJAX submission, local success message, disabled sending state, 20-second timeout, spam honeypot and preserved fields when a request fails. HTML POST remains available without JavaScript. Direct email, Messenger and Eventzonen are alternatives.

[Formspree pricing](https://formspree.io/plans/) and [account limits](https://help.formspree.io/articles/account-management/account-limits): the free tier currently allows 50 submissions per month. Check the existing account usage before launch. Free AJAX support means the clunky redirect need not be part of the experience.

## Calendar recommendation

Use the date field for wedding enquiries first. An empty calendar day does not establish availability: travel, setup, other work and both musicians must be considered.

[Google Calendar appointment schedules](https://support.google.com/calendar/answer/11608416?hl=en) can provide an optional link or embedded booking page for a short introductory conversation, with booked slots blocked out. Some features depend on the account subscription.

A styled public wedding availability view needs a deliberate data source and calendar setup. Prefer a separate availability calendar containing no customer names or venue details. A private-calendar free/busy integration would require a backend; GitHub Pages alone cannot securely hold OAuth credentials. No calendar credentials should be stored in this repository.

## Verification and rollout

JavaScript syntax checked with Node. Desktop and 390px mobile previews inspected, including navigation to the enquiry section. Form delivery and calendar integration still need verification. No external test enquiry was sent. Existing domain and GitHub Pages settings should remain in place. Review the site, test delivery using an explicitly authorised test enquiry, then publish through the normal repository workflow.
