# Flow & Green: måling og samtykke

Opdateret 9. november 2026. Dette er en teknisk opsætningsvejledning, ikke en bekræftelse af at en Google- eller Meta-konto er forbundet.

## Status

Alle fire konto-ID-felter i `assets/analytics-config.js` er tomme. Derfor bliver Google Analytics, Google Ads og Meta Pixel ikke indlæst eller kontaktet af målekoden, heller ikke når en besøgende accepterer statistik eller markedsføring. Det tidligere ID `G-V8FHB0RV9J` er ikke automatisk genbrugt; ejeren skal bekræfte det korrekte ID.

Indlæs de lokale scripts i denne rækkefølge med `defer`:

1. `assets/analytics-config.js`
2. `assets/consent.js`
3. `assets/measurement.js`
4. `assets/redesign.js`

Fjern den gamle ubetingede `gtag.js`-indlæsning og eventuelle andre Google/Meta-tags fra sidernes HTML. Én måleopsætning skal eje hændelserne.

## Hændelser

| Hændelse | Hvad den betyder | Anvendelse |
| --- | --- | --- |
| `page_view` | En visning af den aktuelle side efter statistik-samtykke | Overblik; sendes manuelt én gang pr. sideindlæsning |
| `booking_cta_click` | En tilbuds- eller kontaktknap er valgt | Supplerende måling |
| `form_start` | En bruger begynder at bruge bookingformularen | Supplerende måling |
| `generate_lead` | Formspree har bekræftet modtagelse af en forespørgsel | Primær foreslået konvertering |
| `form_error` | Afsendelsen kunne ikke bekræftes | Fejlfinding |
| `contact_click` | E-mail, Messenger eller Eventzonen vælges | Supplerende måling; et klik er ikke en modtaget henvendelse |
| `video_start` | En ekstern video aktiveres | Supplerende måling; ikke bevis på gennemført afspilning |
| `audio_start` | Den lokale lydafspiller startes | Supplerende måling |
| `repertoire_download` | Repertoirelinket vælges | Supplerende måling; ikke bevis på færdig download |

`generate_lead` kaldes kun efter formularens bekræftede succes. Formular-controlleren forhindrer samtidige eller gentagne afsendelser af den samme færdige formular. En bruger kan bevidst starte en ny forespørgsel; den nye bekræftede afsendelse kan tælle. Der sendes ikke en konvertering ved blot at trykke på Send eller ved at åbne kontaktsektionen. Der tillægges ikke en opdigtet pengeværdi.

Målemodulets offentlige API:

```js
window.FlowGreenAnalytics.track('booking_cta_click', {placement: 'hero'});
window.FlowGreenAnalytics.attribution();
window.FlowGreenAnalytics.inspect();
```

`inspect()` viser kun konfigurationens tilstedeværelse, samtykke, scriptstatus og hændelsestællere. `eventsQueued` betyder lagt i en tilladt lokal kø, ikke dokumenteret levering til en annoncekonto. Kontoens egne værktøjer skal bekræfte modtagelsen.

## Begrænset dataindhold

Eventnavne og parameterværdier tillades kun fra faste lister i `measurement.js`. Det omfatter sidetype, sprog, knapplacering, anledning, indholdets faste ID, formular-ID, kontaktmetode og en teknisk fejlkategori. Navn, e-mail, dato, sted, fritekst, forespørgselsreference og formularindhold sendes ikke af denne kode til Analytics eller Pixel.

Google får en manuelt defineret sideadresse uden query-parametre eller hash, en fast sidetitel og en tom referrer. Sidestier er en fast liste; ukendte stier bliver til forsiden. Det forhindrer, at et selvvalgt URL-felt eller en henvisende URL bliver kopieret ind i de manuelle hændelser.

Kun `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` og `utm_term` kan knyttes til en kampagne. De må være korte ASCII-kampagnelabels med bogstaver, tal, punktummer, bindestreger eller understregninger. E-mailadresser, webadresser, mellemrum, lange talrækker og andre tegn bliver afvist. Sæt derfor eksempelvis `utm_campaign=bryllup-2027` og `utm_content=liveklip-01`. Brug aldrig personnavne eller kundedetaljer i kampagnelabels. `gclid`, `fbclid`, andre klik-ID'er og ukendte URL-parametre bliver ikke gemt eller tilføjet formularen af denne opsætning.

Kampagnelabels kan optræde som skjulte felter i den bekræftede forespørgsel, hvis statistik er accepteret. De bruges til at sammenholde annonce, relevant henvendelse og efterfølgende booking i det manuelle opfølgningsark. Uden statistik-samtykke bliver kampagnedata ikke tilføjet af API'et.

## Samtykke og lagring

- `fg_consent_v1` er lokal, nødvendig præferencelagring. Valg af statistik, markedsføring og eksterne medier genbruges i op til 180 dage. Udløbne, fremtidige eller ugyldige valg fjernes ved næste besøg og giver en ny forespørgsel; et afslag huskes også.
- `fg_campaign_v1` er valgfri `sessionStorage`. Den oprettes først efter statistik-samtykke og må højst genbruges i 30 minutter fra registreringen af den aktuelle kampagne. Den bliver også fjernet ved tilbagetrukket statistik-samtykke. Browserens normale sessionsafslutning fjerner sessionStorage; browserens gendannelse af faner kan dog bevare sessionsdata, så den selvstændige 30-minuttersgrænse håndhæves også af koden.
- Google-scriptet indlæses først ved relevant samtykke og et gyldigt konfigureret ID. Analytics-cookiens levetid sættes til 180 dage uden løbende forlængelse. Google Signals er slået fra. Annoncesamtykke er afvist, hvis kun statistik er valgt. URL passthrough er slået fra.
- Eksterne medier er en selvstændig kategori. Medie-controlleren skal vente på `FlowGreenConsent.has('media')`, reagere på ændringer og fjerne indlejrede afspillere ved tilbagetrækning. En afspilningsknap skal forklare, at YouTube bliver indlæst.
- Ved tilbagetrækning stopper måle-API'et nye hændelser, sætter Googles Analytics-disable-flag, opdaterer allerede indlæste leverandørers samtykkestatus og kasserer ventende hændelser. Tilgængelige førstepartscookies med `_ga`, `_ga_*`, `_gcl_*`, `_fbp` og `_fbc` fjernes for relevante domæner/stier. Andre cookies røres ikke. En allerede hentet tredjepartskode kan ikke gøres uhentet; tredjepartscookies eller oplysninger hos leverandøren kan ikke slettes fra denne side.
- Hvis browseren blokerer lokal lagring, virker valget for den aktuelle side. Hvis et målescript bliver blokeret, virker kontakt og medieindstillinger stadig. Hændelser før samtykke bliver kasseret og ikke afspillet senere.

## Tilslut Google Analytics

1. Bekræft det korrekte GA4-målings-ID med ejeren. Sæt kun `measurementId` i `assets/analytics-config.js`; ingen API-hemmelighed eller separat kopi af Googles tag.
2. Gennemgå webdatastrømmens Enhanced Measurement-indstillinger. Slå automatisk formularmåling og automatiske sidevisninger ved browserhistorik fra, så den manuelle og begrænsede opsætning ikke får parallelle auto-hændelser. `send_page_view: false` alene stopper ikke alle Enhanced Measurement-historikhændelser.
3. Kontrollér kontoens indstillinger for dataopbevaring, Google Signals, annoncedeling og adgang. Den lokale kode kan ikke ændre disse kontoindstillinger. Indhold og privatlivstekst skal svare til den faktiske aktivering.
4. Test i en frisk browser: intet valg eller afslag må ikke indlæse Google. Statistik-samtykke skal indlæse én Google-tag og én manuel sidevisning. Test tilbagetrækning og siden uden lagring/adgang til tredjepartsscripts.
5. Brug DebugView eller Tag Assistant på en kontrolleret test, og kontrollér de tilladte parametre. Udfør en tydeligt mærket, aftalt formularafsendelse til den rigtige indbakke, når ejeren er klar. De automatiske udviklingstests sender ingen rigtige forespørgsler.
6. Markér `generate_lead` som key event. Knapklik, video og formularstart er supplerende hændelser. Opret kun eventbaserede custom dimensions, hvor de hjælper: eksempelvis `page_id`, `occasion` og `placement`.

## Google Ads og Meta senere

Standardforslaget er at importere `generate_lead` fra GA4 til Google Ads som den primære henvendelses-konvertering. De direkte Google Ads-felter forbliver tomme i den model. Hvis man bevidst vælger direkte Google Ads-måling, kan `googleAdsId` og `googleAdsLeadLabel` sættes; konverteringen er da også betinget af markedsførings-samtykke. Gør ikke både importen og den direkte version af samme handling primære.

Meta-adapteren er deaktiveret med tomt `metaPixelId`. Hvis den senere aktiveres efter gennemgang af konto og privatlivstekst, kræver den markedsførings-samtykke. Den anmoder ikke om en automatisk PageView og slår Pixelens automatiske konfiguration fra. Den sender kun en manuel `Lead` efter bekræftet formularsucces, med sidetype/anledning og uden brugerindtastede værdier. Meta-bibliotekets egen standardindsamling af browser- og URL-oplysninger er ikke styret af denne event-allowlist; den skal kontrolleres ved aktivering. Kontoens egne automatisk registrerede hændelser og avancerede matching skal også gennemgås. Ingen Conversions API, upload af kundedata, enhanced conversions eller CRM-forbindelse er aktiveret her.

## Verifikation

Kør `node tests/measurement.test.cjs`. Tests bruger isolerede DOM-, storage- og tag-mocks uden netværk. De kontrollerer afslag, separate kategorier, tom konfiguration, rækkefølgen af Google-samtykke, begrænsede parametre, UTM-filtrering, udløb, manglende lagring, blokerede scripts, dialogstyring og tilbagetrækning. Browser- og kontotests ved aktivering er stadig nødvendige; mocked tests dokumenterer kodeadfærd, ikke modtagelse i en ekstern konto.

Officiel dokumentation kontrolleret 9. november 2026:

- [Google: consent mode og rækkefølge af samtykkekommandoer](https://developers.google.com/tag-platform/security/guides/consent)
- [Google: manuelle sidevisninger og Enhanced Measurement](https://developers.google.com/analytics/devguides/collection/ga4/views)
- [Google: GA4-konfiguration, kampagnefelter og cookieindstillinger](https://developers.google.com/analytics/devguides/collection/ga4/reference/config)
- [Google: anbefalede hændelser, herunder generate_lead](https://developers.google.com/analytics/devguides/collection/ga4/reference/events)

## Versionsstrenge efter ID-ændring

Efter ændringer i `assets/analytics-config.js` eller anden lokal JS/CSS køres `python3 tools/update-asset-versions.py` fra repositoryet. Det opdaterer alle otte HTML-siders lokale filhenvisninger. Ingen separat Google-tag skal indsættes i HTML.
