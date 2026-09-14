# spotreba-benzinu
Jednoduchá kalkulačka spotřeby benzínu

pokus o desktopovou aplikaci pomocí Electronu
https://electronjs.org/docs/tutorial/first-app

## Mapa a trasa

Kalkulačka umí vybrat start a cíl na mapě (nebo vyhledáním adresy) a
automaticky z toho spočítat vzdálenost, kterou pak použije ve výpočtu
spotřeby. Funguje kdekoliv v Evropě (i mimo ni).

Použité služby - všechny mají zdarma dostupnou variantu:

- **Mapa a dlaždice:** [Leaflet](https://leafletjs.com/) +
  [OpenStreetMap](https://www.openstreetmap.org/) - zdarma, bez API klíče.
- **Vyhledání adresy → souřadnice:** [Nominatim](https://nominatim.org/)
  (OpenStreetMap geokódování) - zdarma, bez API klíče.
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
- **Provoz (kolony):** živá data o dopravě zdarma reálně neexistují
  (Google/TomTom/HERE mají jen placené nebo silně omezené API). Místo
  toho je v sekci "Upřesnění" jednoduchý přepínač Plynulý / Běžný /
  Kolony, který spotřebu upraví koeficientem - jde o hrubý odhad, ne
  o měření v reálném čase.
