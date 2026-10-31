# 🕷️ Spider-Sense

Un globo 3D che mostra dove, nelle ultime 48 ore, le notizie hanno riportato **arresti** e **risse** nel mondo. Pensato per un tablet Android, con tema fumetto da Spider-Man, e usabile **senza internet** una volta sincronizzato.

**App online:** https://superhero-app-zeta.vercel.app

## Perché esiste

Nasce come gioco di famiglia: mio figlio è appassionato di Spider-Man e voleva un'app che facesse da "senso di ragno" sul tablet, mostrando sul pianeta dove succede qualcosa. L'occasione concreta è stata Halloween: travestito da Spider-Man, doveva poterla usare in giro, quindi **senza connessione**. Da qui le scelte principali:

- app web installabile (PWA) invece di un'app nativa: niente store, si installa dal browser;
- tutto (pagina, libreria 3D, texture, dati) salvato sul tablet;
- pulsante **Sincronizza** per aggiornare i dati quando c'è rete.

È un gioco, non uno strumento di sicurezza: i dati non vanno usati per decidere nulla nella vita reale.

## Che dati ci sono

Non esiste un database mondiale dei crimini in tempo reale: i dati ufficiali sono nazionali o cittadini e arrivano con giorni o mesi di ritardo. L'app usa quindi **notizie geolocalizzate** dal progetto [GDELT](https://www.gdeltproject.org/) (Global Database of Events, Language and Tone), gratuito e senza chiave API.

**Fonte:** i file *Events* di GDELT 2.0, uno ogni 15 minuti
(`https://data.gdeltproject.org/gdeltv2/AAAAMMGGOOMMSS.export.CSV.zip`, circa 50 KB l'uno). Il server GDELT consente richieste dal browser (CORS aperto), quindi **il tablet scarica direttamente da GDELT**: non c'è un backend nostro.

**Cosa tengo** di ogni evento:

| Campo | Significato |
|---|---|
| `type` | `Arresto` (codice CAMEO 173) o `Aggressione` (182, mostrata come "Risse") |
| `place`, `lat`, `lng` | luogo dell'evento secondo GDELT |
| `n` | numero di citazioni dell'evento nelle notizie |
| `t` | quando GDELT l'ha registrato |
| `u` | indirizzo dell'articolo di origine: serve solo per scartare i doppioni, **non viene mai mostrato né aperto** |

**Cosa scarto** (scelte fatte apposta per un bambino e per la precisione):

- violenza generica (CAMEO 180, quasi solo guerra e terrorismo);
- violenza sessuale (1821), tortura (1822) e omicidio (1823);
- eventi geolocalizzati al centro di un paese o di uno stato: tengo solo posizioni a livello di **città** (`ActionGeo_Type` 3 e 4).

Finestra: ultime 48 ore. Sul globo vengono disegnati al massimo 1500 punti, i più citati.

### Limiti dei dati

- **Sono notizie, non statistiche.** Un punto non dice quanti crimini ci sono in una città, ma che un articolo ne parla.
- **La posizione è approssimata.** GDELT sceglie il luogo leggendo il testo: un articolo su un autista senegalese condannato in Ohio può finire su Dakar.
- **Le notizie non sono consultabili dall'app, per scelta.** In una versione precedente la scheda apriva l'elenco degli articoli del luogo, ma molti arresti riguardano reati non adatti a un bambino: la funzione è stata rimossa. Si vedono solo tipo, luogo, ore fa e citazioni. Anche i tipi di evento scelti (arresti e risse) restano cronaca: per un uso con un bambino conviene comunque accompagnarlo.
- Ogni tanto GDELT salta un file da 15 minuti: l'app lo riprova alla sincronizzazione successiva.

## Come si usa

- **Ruota** il globo col dito, **pizzica** per lo zoom.
- **Tocca** vicino a un punto: l'app sceglie il punto visibile più vicino entro circa 48 px (non serve centrare la barra sottile). Compare un anello giallo e la scheda con tipo, luogo, ore fa e citazioni.
- **Filtri** in basso: Arresti / Risse, e per età 6 ore / 24 ore / Tutto.
- **Sincronizza** in alto a destra: scarica i dati nuovi (solo i file mancanti dopo la prima volta, la prima volta ~10 MB). Parte da sola all'avvio se c'è rete e i dati hanno più di 30 minuti.
- **Installa** dal menu del browser (o dal pulsante che compare): l'app finisce nella home con la sua icona.

Colori: rosso = ultime 6 ore, blu = più vecchie.

## Come funziona

Sito statico senza build e senza dipendenze da installare.

| File | Ruolo |
|---|---|
| `index.html` | interfaccia, globo, filtri, schede, sincronizzazione |
| `sync.js` | scarica da GDELT, decomprime (`DecompressionStream`), filtra e deduplica gli eventi |
| `sw.js` | service worker: serve tutto dalla cache, aggiorna in background |
| `manifest.webmanifest`, `icons/` | installazione e icona |
| `vendor/` | [globe.gl](https://globe.gl/) 2.46.2 e texture di [three-globe](https://github.com/vasturiano/three-globe) 2.45.6, in locale per l'uso offline |
| `server.mjs` | server statico di sviluppo (porta 8080) |
| `check.mjs` | test: scarica 48 ore reali da GDELT e verifica parser e sync |
| `vercel.json`, `.vercelignore` | configurazione del deploy statico su Vercel |

Dettagli utili:

- I dati stanno nel `localStorage` del browser (chiave `spider-sense-db`). Se svuoti i dati del sito, serve una nuova sincronizzazione.
- `VERSION` in `sync.js` va incrementata quando cambia il filtro: i dati salvati con la versione precedente vengono scartati alla sync successiva.
- Il browser non controlla da solo se `sw.js` è cambiato, quindi la pagina lo chiede all'avvio e si ricarica **una volta** quando arriva una nuova versione. Per pubblicare un aggiornamento che arrivi sui tablet, cambia `V` in `sw.js`.

## Sviluppo

Serve solo Node recente (usa `fetch` e `DecompressionStream`; provato con la 24).

```bash
node server.mjs      # http://localhost:8080
node check.mjs       # scarica 48 ore da GDELT e verifica
```

Per provarlo su un tablet Android collegato via USB, con il debug USB attivo:

```bash
adb reverse tcp:8080 tcp:8080   # poi sul tablet: http://localhost:8080
```

I service worker richiedono `https` oppure `localhost`: da un indirizzo di rete locale (`http://192.168…`) l'app funziona ma non si installa e non va offline.

## Pubblicazione

Il progetto è un sito statico su Vercel (`framework: null`, nessuna build). Il repository è collegato a Vercel: a ogni push su `main` parte un nuovo deploy. Dopo una modifica ai file in cache ricorda di aumentare `V` in `sw.js`.

## Crediti

- Dati: [GDELT Project](https://www.gdeltproject.org/), uso gratuito con citazione della fonte.
- Globo 3D: [globe.gl](https://globe.gl/) e [three-globe](https://github.com/vasturiano/three-globe) di Vasco Asturiano (licenza MIT), con [three.js](https://threejs.org/).
- Spider-Man è un personaggio Marvel: questo è un progetto personale e senza scopo di lucro, non affiliato né approvato da Marvel.
