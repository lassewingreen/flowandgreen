# Flow & Green

Statisk, tosproget hjemmeside til GitHub Pages. Dansk er standard. Ingen buildproces eller frontendpakker er nødvendige.

## Offentlige sider

| Formål | Dansk | English |
| --- | --- | --- |
| Forside | `index.html` | `en.html` |
| Bryllupskampagne | `bryllup.html` | `bryllup-en.html` |
| Firmafestkampagne | `firmafest.html` | `firmafest-en.html` |
| Privatliv og cookievalg | `privatliv.html` | `privacy.html` |

Flagene skifter mellem de tilsvarende sider. Formularerne bruger det eksisterende Formspree-endpoint. Kun navn og e-mail kræves; ekstra detaljer er valgfrie. Ingen modtagne henvendelser eller personoplysninger gemmes i dette repository.

## Måling

Alle konto-ID'er i `assets/analytics-config.js` er tomme, indtil ejeren har bekræftet opsætningen. Den gamle ubetingede Google-tag er fjernet fra de aktive sider. Google/Meta indlæses først med relevant samtykke og et konfigureret ID. YouTube kræver et informeret afspilningsvalg; lydoptagelsen er lokalt hostet.

Se `docs/analytics-setup.md` for hændelser, parametre, samtykke, aktivering og kontokontrol. `generate_lead` udløses kun efter bekræftet formularmodtagelse. Videoaktivering og klik er supplerende signaler, ikke bookinger.

Efter ændringer af lokale JS/CSS-filer køres `python3 tools/update-asset-versions.py`, så alle sider får nye versionsstrenge. Der skal ikke tilføjes et ekstra Google-script i HTML.

## Kontrol

- `node --test tests/form.test.cjs tests/measurement.test.cjs tests/languages.test.cjs` kører offline-kontroller med mocks. De sender ingen rigtige henvendelser eller målinger.
- Formspree-kontoens kvote, indbakkelevering og domænebegrænsninger kontrolleres i kontoen før kampagnestart.
- Ved Analytics-aktivering kontrolleres samtykke og levering i browser samt kontoens auto-måling for at undgå dubletter.
- Ægte kundeudtalelser og oplysning om spilleområde er hentet fra Eventzonen den 9. november 2026; engelske citater er markeret som oversættelser. Kilder og lanceringspunkter findes i `docs/content-sources.md`.

## Hosting

Eksisterende GitHub Pages-opsætning og `CNAME` benyttes. Ændringer bliver offentlige ved brugerens sædvanlige commit/push. `sitemap.xml` omfatter de otte offentlige sider; `robots.txt` frabeder indeksering af den gamle backupside.

Kampagne-/bookingarket og den udførlige rapport ligger lokalt uden for den offentlige hjemmeside. Et udfyldt bookingark skal ikke lægges i dette repository.
