# spotreba-benzinu
Jednoduchá kalkulačka spotřeby benzínu

pokus o desktopovou aplikaci pomocí Electronu
https://electronjs.org/docs/tutorial/first-app

## Mapa a trasa

Na širokých displejích je trasa a výpočet vedle sebe, na užších pod sebou.

Kalkulačka umí vybrat start a cíl na mapě (nebo vyhledáním adresy) a
automaticky z toho spočítat vzdálenost, kterou pak použije ve výpočtu
spotřeby. Funguje kdekoliv v Evropě (i mimo ni).

Mezi start a cíl jde vložit libovolný počet **mezizastávek** - trasa pak
vede přes ně, takže se dá vynutit jiná varianta cesty než tu, kterou by
router zvolil sám. Tlačítko **Okruh (zpět na start)** přidá jako poslední
bod znovu start, takže se dá spočítat i okružní jízda. Každý klik do mapy
doplní další bod trasy (poslední je vždy cíl).

Použité služby - všechny mají zdarma dostupnou variantu:

- **Mapa a dlaždice:** [Leaflet](https://leafletjs.com/) +
  [OpenStreetMap](https://www.openstreetmap.org/) - zdarma, bez API klíče.
- **Vyhledání adresy → souřadnice:** [Nominatim](https://nominatim.org/)
  (OpenStreetMap geokódování) - zdarma, bez API klíče. Používá se
  u tlačítka "Najít", tedy jeden dotaz na akci uživatele.
- **Našeptávač míst (psaní po písmenech):** [Photon](https://photon.komoot.io/)
  od Komootu - zdarma, bez API klíče, postavený přímo na
  search-as-you-type nad OSM daty. Nominatim se pro našeptávač použít
  nesmí: jeho [usage policy](https://operations.osmfoundation.org/policies/nominatim/)
  auto-complete nad svým API výslovně zakazuje a povoluje jen 1 dotaz
  za sekundu. Dotazy jsou navíc odloženě (300 ms) a od 3 znaků,
  výsledky se přednostně hledají kolem aktuálního výřezu mapy.
- **Trasa a vzdálenost:** veřejný demo server
  [OSRM](https://project-osrm.org/) - zdarma, bez API klíče. Je to ale
  jen demo instance bez garance dostupnosti, pro běžné soukromé použití
  bohatě stačí.
- **Převýšení (zpřesnění spotřeby):** volitelně
  [OpenRouteService](https://openrouteservice.org/) - vyžaduje vlastní
  zdarma API klíč (registrace na jejich webu, cca 2000 requestů/den
  zdarma). Bez klíče kalkulačka spočítá jen vzdálenost; s klíčem navíc
  zohlední stoupání/klesání trasy a přičte k odhadu spotřeby přirážku
  za převýšení (nastavitelná v sekci "Upřesnění"). Klíč se ukládá jen
  lokálně v prohlížeči (localStorage), nikam se neodesílá jinam.
- **Export do PDF:** tlačítko "Tisk / uložit do PDF" pod výsledkem
  vykreslí samostatnou tiskovou sestavu (vyúčtování cesty jako podklad
  k cestovním výdajům, včetně nepovinného data a účelu cesty) a otevře
  tiskový dialog prohlížeče, kde se dá zvolit "Uložit jako PDF".
  Záměrně bez knihovny typu jsPDF - tisk přes prohlížeč dává ostrý
  vektorový text, funguje offline a nemá problém s českou diakritikou
  (jsPDF by potřeboval embedovat vlastní TTF font).
- **Obrázek trasy v sestavě:** skládá se z OSM dlaždic na `<canvas>`,
  do kterého se dokreslí geometrie trasy a číslované body (čísla
  odpovídají seznamu bodů nad mapou). Dlaždice OSM posílají CORS
  hlavičky, takže z canvasu jde vytáhnout obrázek přes `toDataURL()`.
  Když se dlaždice nenačtou, vykreslí se aspoň trasa na podkladu.
- **Provoz (kolony):** živá data o dopravě zdarma reálně neexistují
  (Google/TomTom/HERE mají jen placené nebo silně omezené API). Místo
  toho je v sekci "Upřesnění" jednoduchý přepínač Plynulý / Běžný /
  Kolony, který spotřebu upraví koeficientem - jde o hrubý odhad, ne
  o měření v reálném čase.
