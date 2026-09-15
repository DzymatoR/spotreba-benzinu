# Spotřeba benzínu

Kalkulačka ceny cesty autem. Vybereš trasu na mapě (klikem nebo vyhledáním
adresy), doplníš spotřebu a cenu paliva a appka spočítá, kolik cesta stojí
celkem i na jednoho člověka v autě. Výsledek jde vytisknout nebo uložit
jako PDF jako podklad k cestovním výdajům.

Funguje kdekoliv v Evropě (a vlastně i mimo ni). Je to jedna statická
stránka - žádný server, žádný build, žádná registrace. Jediné, co se ukládá,
je nepovinný API klíč, a to jen ve tvém prohlížeči.

---

## Obsah

- [Rychlý start](#rychlý-start)
- [Co appka umí](#co-appka-umí)
- [Návod k použití](#návod-k-použití)
- [Jak získat klíč pro převýšení](#jak-získat-klíč-pro-převýšení-openrouteservice)
- [Kde vzít aktuální cenu paliva](#kde-vzít-aktuální-cenu-paliva)
- [Když něco nefunguje](#když-něco-nefunguje)
- [Použité služby a jejich limity](#použité-služby-a-jejich-limity)
- [Jak se počítá spotřeba](#jak-se-počítá-spotřeba)
- [Pro vývoj](#pro-vývoj)

---

## Rychlý start

Stačí otevřít `index.html` v prohlížeči. Kvůli volání map a geokódování je
ale lepší to pustit přes lokální server, aby se appka chovala stejně jako
na ostrém webu:

```bash
python3 -m http.server 8000
# nebo
npx serve .
```

Pak otevři <http://localhost:8000>.

---

## Co appka umí

| Funkce | Popis |
|---|---|
| **Trasa na mapě** | Start, cíl a libovolný počet mezizastávek - klikem do mapy nebo vyhledáním adresy. |
| **Našeptávač míst** | Od 3 znaků nabízí seznam míst, výběr myší i klávesnicí. |
| **Okruh** | Jedním tlačítkem přidá zpáteční cestu na start (okružní jízda). |
| **Tam a zpět** | Zaškrtávátko, které zdvojnásobí vzdálenost bez počítání reálné zpáteční trasy. |
| **Doba jízdy a stoupání** | Vypíše se u trasy; stoupání jen s vlastním API klíčem (viz níže). |
| **Zohlednění provozu** | Přepínač plynulý / běžný / kolony, který spotřebu upraví koeficientem. |
| **Přirážka za převýšení** | Stoupání zvyšuje spotřebu; nastavitelná sazba v litrech na 100 m stoupání. |
| **Rozpočet na osobu** | Kolik zaplatí každý, když se cesta dělí. |
| **Export do PDF** | Jednostránkové vyúčtování s náhledem trasy, datem a účelem cesty. |
| **Tmavý režim** | Automaticky podle nastavení systému. |

---

## Návod k použití

### 1. Sestavení trasy

Body trasy jsou seznam: **první je start, poslední cíl** a mezi nimi může
být kolik zastávek chceš.

Body se zadávají dvěma způsoby - klidně zároveň:

- **Klikáním do mapy.** Každý klik doplní další bod. První klik nastaví
  start, druhý cíl, třetí a další se přidávají na konec - z dosavadního
  cíle se přitom stane zastávka.
- **Vyhledáním adresy.** Začni psát do pole u bodu a od 3 znaků se objeví
  nabídka míst. Vyber myší nebo šipkami a Enterem. Tlačítko **Najít**
  vyhledá nejlepší shodu bez procházení nabídky.

Další možnosti:

- **Přidat zastávku** vloží nový bod přesně tam, kde tlačítko je - tedy
  před cíl.
- **Okruh (zpět na start)** přidá na konec znovu start, takže se spočítá
  i cesta zpátky. Tohle je jiné než "Tam a zpět" níže: okruh počítá
  skutečnou trasu přes zadané body, kdežto "Tam a zpět" jen zdvojnásobí
  číslo.
- **Křížkem** u bodu ho odebereš (objeví se, jakmile jsou body víc než dva).
- **Vymazat trasu** začne od nuly.

Proč zastávky? Router jinak vybere jednu trasu podle svého. Zastávkou ho
donutíš jet tudy, kudy reálně pojedeš.

Nakonec klikni na **Spočítat trasu**. Vykreslí se čára na mapě, doplní se
vzdálenost do výpočtu a nad mapou se objeví vzdálenost, doba jízdy
a případně stoupání.

### 2. Auto a posádka

- **Vzdálenost** se vyplní sama ze spočítané trasy, ale jde ji kdykoliv
  přepsat ručně - mapu vůbec nemusíš použít.
- **Tam a zpět (×2)** zdvojnásobí vzdálenost i přirážku za převýšení.
- **Cena paliva** - výchozí hodnota je jen orientační, aktuální cenu si
  ověř (viz [níže](#kde-vzít-aktuální-cenu-paliva)).
- **Spotřeba** vozidla v litrech na 100 km. Šipky přidávají po 0,1 l.
- **Počet osob** rozpočítá výslednou částku.

Pak **Spočítej mi to!** a dole se objeví celková cena i cena na osobu.

### 3. Upřesnění (volitelné)

Rozklikávací sekce pod trasou:

- **Hustota provozu** - koeficient, kterým se přenásobí spotřeba:
  plynulý ×1,00, běžný ×1,06, kolony ×1,18. Je to odhad, ne živá data
  o dopravě.
- **Vlastní API klíč (OpenRouteService)** - odemkne počítání převýšení,
  viz [návod níže](#jak-získat-klíč-pro-převýšení-openrouteservice).
- **Zohlednit převýšení trasy** - zapíná přirážku za stoupání.
- **Přirážka za 100 m stoupání** - kolik litrů navíc se připočte za
  každých 100 metrů nastoupaných. Výchozí 0,15 l je hrubý odhad pro
  běžné auto; těžší vozidlo spotřebuje víc.

### 4. Vyúčtování do PDF

Pod výsledkem je blok **Podklad k vyúčtování**:

1. Vyplň **datum cesty** (předvyplněné na dnešek) a **účel cesty** -
   obojí nepovinné, prázdné pole se do dokladu nedá.
2. Klikni na **Tisk / uložit do PDF**.
3. V tiskovém dialogu prohlížeče zvol **Uložit jako PDF** (v Chrome
   položka "Cíl" → "Uložit jako PDF").

Doklad se vejde na jednu stránku A4 na výšku a obsahuje hlavičku s datem,
seznam bodů trasy, malý náhled trasy na mapě, parametry (vzdálenost, doba
jízdy, stoupání), rozpad výpočtu a celkovou částku včetně podílu na osobu.

> Náhled mapy se skládá až ve chvíli, kdy na tlačítko klikneš, takže to
> může chvilku trvat - appka to hlásí u tlačítka.

---

## Jak získat klíč pro převýšení (OpenRouteService)

Bez klíče appka spočítá vzdálenost a dobu jízdy, ale **ne stoupání** -
trasy počítá veřejný server OSRM, který nadmořskou výšku nevrací.
S vlastním klíčem k [OpenRouteService](https://openrouteservice.org/) se
trasa počítá přes ně a přijde i celkové stoupání, ze kterého se pak dá
odhadnout přirážka ke spotřebě.

Klíč je zdarma a získáš ho takhle:

1. Jdi na <https://openrouteservice.org/dev/#/signup> a zaregistruj se
   (e-mail + heslo).
2. Potvrď registraci odkazem v e-mailu.
3. Přihlas se do vývojářského portálu (Dev dashboard).
4. Vyžádej si token pro plán **Free** (v rozhraní bývá jako "Request
   a token" / "Free plan"), pojmenuj ho třeba `spotreba-benzinu`.
5. Vygenerovaný klíč zkopíruj.
6. V appce rozbal **Upřesnění** a vlož ho do pole **Vlastní API klíč
   (OpenRouteService)**.

Klíč se uloží do `localStorage` tvého prohlížeče, takže ho příště nemusíš
zadávat znovu. Nikam jinam se neposílá - jen přímo na API
OpenRouteService.

> Přesné názvy tlačítek v jejich portálu se můžou časem měnit; princip
> (registrace → dashboard → token pro Free plán) zůstává stejný.

**Limity zdarma plánu:** cca 2 000 dotazů denně a 40 za minutu pro výpočet
tras - na osobní použití to bohatě stačí.

---

## Kde vzít aktuální cenu paliva

Appka cenu nestahuje automaticky - žádné veřejné API s aktuálními
průměrnými cenami paliva v ČR, které by šlo volat přímo z prohlížeče,
neexistuje (chybí CORS a pro statickou stránku bez serveru to nejde
obejít).

U pole **Cena paliva** je proto odkaz na
[ČSÚ DataStat](https://data.csu.gov.cz/datastat/data/VYBER/CENPHMTT01),
kde jsou týdenní průměrné ceny benzínu, nafty i LPG za celou ČR. Cenu si
odtud opíšeš do pole.

---

## Když něco nefunguje

**Změny se neprojevily / stránka vypadá rozbitě**
Prohlížeč drží starou verzi `style.css` nebo `script.js` v cache. Dej
hard refresh (Ctrl+Shift+R), případně otevři stránku v novém okně.

**Našeptávač míst nic nenabízí**
Pod trasou se objeví hláška s důvodem. Nejčastěji je nedostupná služba
Photon - adresu pak najdeš tlačítkem **Najít**, které používá jinou
službu.

**Mapa se nenačetla**
Objeví se hláška u trasy. Vyhledávání adres i výpočet vzdálenosti fungují
dál, jen se nevykreslí mapa ani čára trasy.

**Trasa jede nesmyslnou oklikou**
Když klikneš do mapy daleko od silnice (les, pole, voda), router bod
přichytí k nejbližší použitelné cestě - a ta může být na druhé straně
kopce. Zkus bod posunout blíž k silnici nebo ho zadat adresou.

**PDF má obsah useknutý u kraje**
Zkontroluj, že máš aktuální verzi - okraje jsou od verze 2.5 nezávislé na
nastavení okrajů v tiskovém dialogu.

---

## Použité služby a jejich limity

Všechny mají zdarma dostupnou variantu a kromě OpenRouteService nevyžadují
žádný klíč:

| Co | Služba | Poznámka |
|---|---|---|
| Mapa a dlaždice | [Leaflet](https://leafletjs.com/) + [OpenStreetMap](https://www.openstreetmap.org/) | Bez klíče. |
| Našeptávač míst | [Photon](https://photon.komoot.io/) (Komoot) | Bez klíče, postavený na search-as-you-type. |
| Vyhledání adresy (tlačítko Najít) | [Nominatim](https://nominatim.org/) | Bez klíče, jeden dotaz na akci uživatele. |
| Trasa, vzdálenost, doba jízdy | [OSRM](https://project-osrm.org/) - veřejný demo server | Bez klíče, ale bez záruky dostupnosti. |
| Převýšení | [OpenRouteService](https://openrouteservice.org/) | Volitelné, vlastní klíč zdarma. |

Pár věcí, které stojí za vysvětlení:

- **Proč dvě různé služby na hledání míst?** Nominatim ve své
  [usage policy](https://operations.osmfoundation.org/policies/nominatim/)
  našeptávání nad svým API výslovně zakazuje a povoluje jen 1 dotaz za
  sekundu. Na psaní po písmenech se proto používá Photon, který je na to
  stavěný. Nominatim zůstává u tlačítka "Najít", což je jeden dotaz na
  akci uživatele - a slouží zároveň jako záloha.
- **Dotazy našeptávače** jsou odložené o 300 ms, posílají se od 3 znaků
  a rozdělané se ruší, ať se šetří cizí server.
- **Data o dopravě** zdarma nejsou (Google/TomTom/HERE mají jen placené
  nebo silně omezené API), proto je provoz jen ručním koeficientem.
- **Export do PDF** je záměrně přes tisk prohlížeče, ne přes knihovnu typu
  jsPDF: dává ostrý vektorový text, nepotřebuje další závislost a nemá
  problém s českou diakritikou (jsPDF by si vyžádal embedovaný TTF font).
- **Náhled trasy v PDF** se skládá z OSM dlaždic na `<canvas>`, do kterého
  se dokreslí geometrie trasy a číslované body. Dlaždice OSM posílají CORS
  hlavičky, takže z canvasu jde vytáhnout obrázek přes `toDataURL()`.
  Když se dlaždice nenačtou, vykreslí se aspoň trasa na podkladu.

---

## Jak se počítá spotřeba

```
litry za trasu     = vzdálenost × (spotřeba × koeficient provozu) / 100
litry za převýšení = (stoupání v m / 100) × přirážka za 100 m
                     (jen když je zapnuté a je známé stoupání)

při "tam a zpět" se obojí násobí dvěma

cena celkem = (litry za trasu + litry za převýšení) × cena za litr
na osobu    = cena celkem / počet osob
```

Je to odhad, ne měření: styl jízdy, počasí, náklad i skutečná hustota
provozu můžou výsledek posunout.

---

## Pro vývoj

Projekt je záměrně bez build kroku - čistý HTML, CSS a JS:

| Soubor | Obsah |
|---|---|
| `index.html` | Struktura stránky včetně skryté tiskové sestavy. |
| `style.css` | Design tokeny (světlý i tmavý režim), layout, tiskové styly. |
| `script.js` | Výpočet, práce s trasou, mapa, našeptávač, generování sestavy. |
| `favicon.svg` | Ikona. |

**Cache-busting:** `index.html` odkazuje na `style.css?v=N` a
`script.js?v=N`. **Po každé úpravě CSS nebo JS to číslo zvyš** - jinak
uvidíš starou verzi ze své cache (a hlavně ji uvidí i ostatní).

**Verze** se zobrazuje v horní liště a je zároveň v `package.json`. Do
tiskové sestavy se přebírá z lišty, ať není číslo v HTML na dvou místech.

**Testování v prohlížeči:** appka nemá automatické testy, ale je dobře
testovatelná přes Playwright - většina logiky (`pridejBodZMapy`,
`vykresliBody`, `prepocitej`, `vytvorObrazekTrasy`) je dostupná
z globálního scope, takže jde volat přímo z `page.evaluate()`.

---

DžyM, od 2018
