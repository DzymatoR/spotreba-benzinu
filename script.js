// ---------- prvky kalkulačky ----------
var vzdalenost = document.querySelector("#vzdalenost");
var cena = document.querySelector("#cena");
var spotreba = document.querySelector("#spotreba");
var osoby = document.querySelector("#osoby");
var tlacitko = document.querySelector("#tlacitko");
var jednotlivec = document.querySelector("#VyraznaCenaJ");
var celkem = document.querySelector("#VyraznaCenaC");

// ---------- prvky trasy / mapy ----------
var trasaBodyEl = document.querySelector("#trasaBody");
var okruhBtn = document.querySelector("#okruhBtn");
var vypocitatTrasu = document.querySelector("#vypocitatTrasu");
var vymazatTrasu = document.querySelector("#vymazatTrasu");
var trasaInfo = document.querySelector("#trasaInfo");
var mapaHint = document.querySelector("#mapaHint");
var orsKlic = document.querySelector("#orsKlic");
var zohlednitPrevyseni = document.querySelector("#zohlednitPrevyseni");
var prevyseniFactor = document.querySelector("#prevyseniFactor");
var provoz = document.querySelector("#provoz");
var prevyseniCheckRow = document.querySelector("#prevyseniCheckRow");
var tamZpet = document.querySelector("#tamZpet");

// chipy se stavem trasy
var chipEmpty = document.querySelector("#chipEmpty");
var chipDistance = document.querySelector("#chipDistance");
var chipDistanceVal = document.querySelector("#chipDistanceVal");
var chipElevation = document.querySelector("#chipElevation");
var chipElevationVal = document.querySelector("#chipElevationVal");
var chipDuration = document.querySelector("#chipDuration");
var chipDurationVal = document.querySelector("#chipDurationVal");

// výsledková karta
var resultEmpty = document.querySelector("#resultEmpty");
var resultComputed = document.querySelector("#resultComputed");
var resultTags = document.querySelector("#resultTags");

// akordeon "Upřesnění"
var accordionHead = document.querySelector("#accordionHead");
var accordionBody = document.querySelector("#accordionBody");
var accordionChevron = document.querySelector("#accordionChevron");

// stoupání aktuální trasy v metrech (naplní se jen když je k dispozici OpenRouteService klíč)
var aktualniStoupani = 0;
// doba jízdy spočítané trasy v sekundách (0 = trasa zatím nespočítaná)
var aktualniDobaS = 0;
// geometrie spočítané trasy - používá se i pro obrázek do tiskové sestavy
var aktualniGeojson = null;

// ---------- stav trasy ----------
// Body trasy v pořadí: první = start, poslední = cíl, mezi nimi zastávky.
function novyBod() {
  return { dotaz: "", lat: null, lon: null, nazev: "", marker: null };
}

function maSouradnice(bod) {
  return bod.lat !== null && bod.lon !== null;
}

var body = [novyBod(), novyBod()];

// mapa se nastaví níže, pokud se Leaflet povede načíst
var mapa = null;
var mapaDostupna = false;
var trasaVrstva = null;

// ---------- akordeon: klik na hlavičku otevře/zavře Upřesnění ----------
accordionHead.addEventListener("click", function () {
  var otevreno = !accordionBody.hidden;
  accordionBody.hidden = otevreno;
  accordionChevron.classList.toggle("chev-open", !otevreno);
});

// ---------- zvýraznění checkboxu "Zohlednit převýšení" ----------
function aktualizujCheckRow() {
  prevyseniCheckRow.style.borderColor = zohlednitPrevyseni.checked ? "var(--terra)" : "var(--line)";
  prevyseniCheckRow.style.background = zohlednitPrevyseni.checked ? "var(--cream-soft)" : "var(--surface)";
}
zohlednitPrevyseni.addEventListener("change", aktualizujCheckRow);
aktualizujCheckRow();

// ---------- pomocníci pro formátování ----------
function formatujCas(sekundy) {
  var minutyCelkem = Math.round(sekundy / 60);
  var h = Math.floor(minutyCelkem / 60);
  var m = minutyCelkem % 60;
  if (h > 0) { return h + " h " + m + " min"; }
  return m + " min";
}

function nazevProvozu(hodnota) {
  var moznosti = provoz.options;
  for (var i = 0; i < moznosti.length; i++) {
    if (moznosti[i].value === hodnota) { return moznosti[i].text; }
  }
  return "";
}

// ---------- výpočet ceny ----------
function prepocitej() {
  var koeficientProvozu = Number(provoz.value) || 1;
  var efektivniSpotreba = Number(spotreba.value) * koeficientProvozu;
  var koeficientSmeru = tamZpet.checked ? 2 : 1;
  var efektivniVzdalenost = Number(vzdalenost.value) * koeficientSmeru;

  var litryZaTrasu = (efektivniVzdalenost * efektivniSpotreba) / 100;

  var litryZaPrevyseni = 0;
  if (zohlednitPrevyseni.checked && aktualniStoupani > 0) {
    litryZaPrevyseni = (aktualniStoupani / 100) * Number(prevyseniFactor.value || 0) * koeficientSmeru;
  }

  var celkoveLitry = litryZaTrasu + litryZaPrevyseni;
  var vypocetSkupina = (celkoveLitry * Number(cena.value)).toFixed(2);
  var vypocetJednotlivec = (vypocetSkupina / Number(osoby.value)).toFixed(2);

  // stejné formátování jako v tiskové sestavě (včetně oddělovače tisíců)
  celkem.textContent = cislo(Number(vypocetSkupina), 2);
  jednotlivec.textContent = cislo(Number(vypocetJednotlivec), 2);

  // tagy shrnující vstupy pod výslednou cenou
  resultTags.innerHTML = "";
  var pocetZastavek = body.length - 2;
  var tagy = [
    efektivniVzdalenost.toLocaleString("cs-CZ") + " km" + (tamZpet.checked ? " (tam a zpět)" : ""),
    Number(spotreba.value).toLocaleString("cs-CZ") + " l/100 km" +
      (litryZaPrevyseni > 0 ? " (+ převýšení)" : ""),
    Number(cena.value).toLocaleString("cs-CZ") + " Kč/l",
    Number(osoby.value) + " " + (Number(osoby.value) === 1 ? "osoba" : "osob") + " · " + nazevProvozu(provoz.value)
  ];
  if (pocetZastavek > 0) {
    tagy.splice(1, 0, pocetZastavek + " " + (pocetZastavek === 1 ? "zastávka" : (pocetZastavek < 5 ? "zastávky" : "zastávek")));
  }
  tagy.forEach(function (text) {
    var span = document.createElement("span");
    span.className = "tag";
    span.textContent = text;
    resultTags.appendChild(span);
  });

  resultEmpty.hidden = true;
  resultComputed.hidden = false;

  return {
    vzdalenostJednosmer: Number(vzdalenost.value),
    vzdalenostCelkem: efektivniVzdalenost,
    tamZpet: tamZpet.checked,
    spotrebaVozidla: Number(spotreba.value),
    provozNazev: nazevProvozu(provoz.value),
    litryZaTrasu: litryZaTrasu,
    litryZaPrevyseni: litryZaPrevyseni,
    celkoveLitry: celkoveLitry,
    cenaZaLitr: Number(cena.value),
    cenaCelkem: Number(vypocetSkupina),
    cenaNaOsobu: Number(vypocetJednotlivec),
    osoby: Number(osoby.value)
  };
}

tlacitko.addEventListener("click", prepocitej);

// ---------- tisková sestava (podklad k cestovním výdajům) ----------
var tiskBtn = document.querySelector("#tiskBtn");
var tiskPopis = document.querySelector("#tiskPopis");
var tiskDatum = document.querySelector("#tiskDatum");
var tiskUdaje = document.querySelector("#tiskUdaje");
var tiskBodyEl = document.querySelector("#tiskBody");
var tiskTrasa = document.querySelector("#tiskTrasa");
var tiskVypocet = document.querySelector("#tiskVypocet");
var tiskSoucet = document.querySelector("#tiskSoucet");
var tiskMapa = document.querySelector("#tiskMapa");
var tiskMapaObal = document.querySelector("#tiskMapaObal");
var datumCesty = document.querySelector("#datumCesty");
var popisCesty = document.querySelector("#popisCesty");

// datum cesty předvyplníme na dnešek, ať ho nemusí vyplňovat každý ručně
(function () {
  var dnes = new Date();
  var mesic = String(dnes.getMonth() + 1).padStart(2, "0");
  var den = String(dnes.getDate()).padStart(2, "0");
  datumCesty.value = dnes.getFullYear() + "-" + mesic + "-" + den;
})();

function cislo(hodnota, desetinnych) {
  return hodnota.toLocaleString("cs-CZ", {
    minimumFractionDigits: desetinnych,
    maximumFractionDigits: desetinnych
  });
}

function pridejRadek(seznam, popis, hodnota) {
  var dt = document.createElement("dt");
  dt.textContent = popis;
  var dd = document.createElement("dd");
  dd.textContent = hodnota;
  seznam.appendChild(dt);
  seznam.appendChild(dd);
}

// ---------- statická mapa trasy do tiskové sestavy ----------
// Skládá se z OSM dlaždic na canvas a kreslí se do ní skutečná geometrie trasy.
// Dlaždice OSM posílají Access-Control-Allow-Origin, takže canvas zůstane
// "čistý" a jde z něj vytáhnout obrázek přes toDataURL().
var DLAZDICE = 256;
var MAPA_SIRKA = 760;
var MAPA_VYSKA = 340;
var MAPA_OKRAJ = 55; // rezerva, ať trasa nekončí přesně na hraně

function lonNaX(lon, zoom) {
  return (lon + 180) / 360 * Math.pow(2, zoom);
}

function latNaY(lat, zoom) {
  var rad = lat * Math.PI / 180;
  return (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * Math.pow(2, zoom);
}

// geometrie trasy jako plochý seznam [lon, lat] (ORS vrací i nadmořskou výšku navíc)
function souradniceTrasy() {
  if (!aktualniGeojson) { return []; }
  var souradnice = aktualniGeojson.coordinates || [];
  if (aktualniGeojson.type === "MultiLineString") {
    return souradnice.reduce(function (vse, cast) { return vse.concat(cast); }, []);
  }
  return souradnice;
}

function obalTrasy(cesta) {
  var obal = { minLon: 180, maxLon: -180, minLat: 90, maxLat: -90 };
  cesta.forEach(function (bod) {
    obal.minLon = Math.min(obal.minLon, bod[0]);
    obal.maxLon = Math.max(obal.maxLon, bod[0]);
    obal.minLat = Math.min(obal.minLat, bod[1]);
    obal.maxLat = Math.max(obal.maxLat, bod[1]);
  });
  return obal;
}

// největší zoom, při kterém se celá trasa ještě vejde do obrázku
function vyberZoom(obal) {
  for (var zoom = 17; zoom >= 1; zoom--) {
    var sirka = (lonNaX(obal.maxLon, zoom) - lonNaX(obal.minLon, zoom)) * DLAZDICE;
    var vyska = (latNaY(obal.minLat, zoom) - latNaY(obal.maxLat, zoom)) * DLAZDICE;
    if (sirka <= MAPA_SIRKA - MAPA_OKRAJ && vyska <= MAPA_VYSKA - MAPA_OKRAJ) { return zoom; }
  }
  return 1;
}

function nactiDlazdici(x, y, zoom) {
  return new Promise(function (resolve) {
    var obrazek = new Image();
    obrazek.crossOrigin = "anonymous";
    var hotovo = false;
    var dokonci = function (uspech) {
      if (hotovo) { return; }
      hotovo = true;
      resolve(uspech ? obrazek : null);
    };
    obrazek.onload = function () { dokonci(true); };
    obrazek.onerror = function () { dokonci(false); };
    setTimeout(function () { dokonci(false); }, 8000);
    obrazek.src = "https://tile.openstreetmap.org/" + zoom + "/" + x + "/" + y + ".png";
  });
}

function vytvorObrazekTrasy() {
  var cesta = souradniceTrasy();
  if (!cesta.length) { return Promise.resolve(null); }

  var obal = obalTrasy(cesta);
  var zoom = vyberZoom(obal);
  var stredX = (lonNaX(obal.minLon, zoom) + lonNaX(obal.maxLon, zoom)) / 2 * DLAZDICE;
  var stredY = (latNaY(obal.minLat, zoom) + latNaY(obal.maxLat, zoom)) / 2 * DLAZDICE;
  var pocatekX = stredX - MAPA_SIRKA / 2;
  var pocatekY = stredY - MAPA_VYSKA / 2;

  var platno = document.createElement("canvas");
  platno.width = MAPA_SIRKA;
  platno.height = MAPA_VYSKA;
  var ctx = platno.getContext("2d");
  ctx.fillStyle = "#EFE7D6";
  ctx.fillRect(0, 0, MAPA_SIRKA, MAPA_VYSKA);

  function naPlatno(lon, lat) {
    return {
      x: lonNaX(lon, zoom) * DLAZDICE - pocatekX,
      y: latNaY(lat, zoom) * DLAZDICE - pocatekY
    };
  }

  // seznam dlaždic, které obrázek pokrývají
  var pocetDlazdic = Math.pow(2, zoom);
  var ukoly = [];
  for (var dx = Math.floor(pocatekX / DLAZDICE); dx <= Math.floor((pocatekX + MAPA_SIRKA) / DLAZDICE); dx++) {
    for (var dy = Math.floor(pocatekY / DLAZDICE); dy <= Math.floor((pocatekY + MAPA_VYSKA) / DLAZDICE); dy++) {
      if (dy < 0 || dy >= pocetDlazdic) { continue; }
      var dlazdiceX = ((dx % pocetDlazdic) + pocetDlazdic) % pocetDlazdic;
      ukoly.push({ x: dlazdiceX, y: dy, kamX: dx * DLAZDICE - pocatekX, kamY: dy * DLAZDICE - pocatekY });
    }
  }

  return Promise.all(ukoly.map(function (ukol) {
    return nactiDlazdici(ukol.x, ukol.y, zoom).then(function (obrazek) {
      // dlaždice, která se nenačte, se prostě nevykreslí (zůstane podklad)
      if (obrazek) { ctx.drawImage(obrazek, ukol.kamX, ukol.kamY, DLAZDICE, DLAZDICE); }
    });
  })).then(function () {
    // čára trasy - bílé podbarvení a přes něj barva trasy
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    [{ barva: "#FFFFFF", sirka: 9 }, { barva: "#C2603C", sirka: 5 }].forEach(function (vrstva) {
      ctx.beginPath();
      cesta.forEach(function (bod, index) {
        var mistoNaPlatne = naPlatno(bod[0], bod[1]);
        if (index === 0) { ctx.moveTo(mistoNaPlatne.x, mistoNaPlatne.y); }
        else { ctx.lineTo(mistoNaPlatne.x, mistoNaPlatne.y); }
      });
      ctx.strokeStyle = vrstva.barva;
      ctx.lineWidth = vrstva.sirka;
      ctx.stroke();
    });

    // číslované body trasy, čísla odpovídají seznamu v sestavě
    body.forEach(function (bod, index) {
      if (!maSouradnice(bod)) { return; }
      var misto = naPlatno(bod.lon, bod.lat);
      var posledni = index === body.length - 1;
      ctx.beginPath();
      ctx.arc(misto.x, misto.y, 11, 0, Math.PI * 2);
      ctx.fillStyle = posledni ? "#C2603C" : "#325573";
      ctx.fill();
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(index + 1), misto.x, misto.y + 1);
    });

    // povinná atribuce OpenStreetMap
    var popisek = "© OpenStreetMap contributors";
    ctx.font = "13px sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    var sirkaPopisku = ctx.measureText(popisek).width;
    ctx.fillStyle = "rgba(255, 255, 255, .8)";
    ctx.fillRect(MAPA_SIRKA - sirkaPopisku - 14, MAPA_VYSKA - 24, sirkaPopisku + 12, 20);
    ctx.fillStyle = "#333333";
    ctx.fillText(popisek, MAPA_SIRKA - 8, MAPA_VYSKA - 7);

    try {
      return platno.toDataURL("image/png");
    } catch (chyba) {
      // kdyby některá dlaždice přišla bez CORS hlaviček, canvas by byl "znečištěný"
      console.error("Obrázek mapy se nepodařilo vytvořit:", chyba);
      return null;
    }
  });
}

function nastavObrazekDoSestavy(dataUrl) {
  return new Promise(function (resolve) {
    if (!dataUrl) {
      tiskMapaObal.hidden = true;
      resolve();
      return;
    }
    tiskMapa.onload = function () { resolve(); };
    tiskMapa.onerror = function () { tiskMapaObal.hidden = true; resolve(); };
    tiskMapa.src = dataUrl;
    tiskMapaObal.hidden = false;
  });
}

function naplnTiskovouSestavu(souhrn) {
  tiskDatum.textContent = "Vystaveno " + new Date().toLocaleDateString("cs-CZ");

  // verzi bereme z horní lišty, ať není číslo v HTML na dvou místech
  var verzeEl = document.querySelector(".verze");
  document.querySelector("#tiskVerze").textContent = verzeEl ? verzeEl.textContent : "";

  // datum a účel cesty - obojí nepovinné, prázdné se do sestavy nedává
  tiskUdaje.innerHTML = "";
  if (datumCesty.value) {
    var den = new Date(datumCesty.value + "T00:00:00");
    pridejRadek(tiskUdaje, "Datum cesty", isNaN(den) ? datumCesty.value : den.toLocaleDateString("cs-CZ"));
  }
  if (popisCesty.value.trim()) {
    pridejRadek(tiskUdaje, "Účel cesty", popisCesty.value.trim());
  }

  // body trasy
  tiskBodyEl.innerHTML = "";
  body.forEach(function (bod, index) {
    var li = document.createElement("li");
    var popis = bod.nazev || bod.dotaz;
    if (!popis && maSouradnice(bod)) { popis = bod.lat.toFixed(4) + ", " + bod.lon.toFixed(4); }
    li.textContent = roleBodu(index) + ": " + (popis || "neurčeno");
    tiskBodyEl.appendChild(li);
  });

  // parametry trasy
  tiskTrasa.innerHTML = "";
  pridejRadek(tiskTrasa, "Vzdálenost trasy", cislo(souhrn.vzdalenostJednosmer, 1) + " km");
  if (souhrn.tamZpet) {
    pridejRadek(tiskTrasa, "Ujeto celkem (tam a zpět)", cislo(souhrn.vzdalenostCelkem, 1) + " km");
  }
  if (aktualniDobaS > 0) {
    pridejRadek(tiskTrasa, "Doba jízdy", formatujCas(aktualniDobaS) + (souhrn.tamZpet ? " (jedním směrem)" : ""));
  }
  if (aktualniStoupani > 0) {
    pridejRadek(tiskTrasa, "Stoupání", Math.round(aktualniStoupani) + " m" + (souhrn.tamZpet ? " (jedním směrem)" : ""));
  }

  // výpočet spotřeby
  tiskVypocet.innerHTML = "";
  pridejRadek(tiskVypocet, "Spotřeba vozidla", cislo(souhrn.spotrebaVozidla, 1) + " l/100 km");
  pridejRadek(tiskVypocet, "Zohlednění provozu", souhrn.provozNazev);
  pridejRadek(tiskVypocet, "Palivo za trasu", cislo(souhrn.litryZaTrasu, 2) + " l");
  if (souhrn.litryZaPrevyseni > 0) {
    pridejRadek(tiskVypocet, "Přirážka za převýšení", cislo(souhrn.litryZaPrevyseni, 2) + " l");
  }
  pridejRadek(tiskVypocet, "Spotřebováno celkem", cislo(souhrn.celkoveLitry, 2) + " l");
  pridejRadek(tiskVypocet, "Cena paliva", cislo(souhrn.cenaZaLitr, 2) + " Kč/l");

  // součet
  tiskSoucet.innerHTML = "";
  var celkemRadek = document.createElement("div");
  celkemRadek.className = "tisk-celkem";
  celkemRadek.innerHTML = "<span>Celkem</span>";
  var castka = document.createElement("strong");
  castka.textContent = cislo(souhrn.cenaCelkem, 2) + " Kč";
  celkemRadek.appendChild(castka);
  tiskSoucet.appendChild(celkemRadek);

  if (souhrn.osoby > 1) {
    var osobyRadek = document.createElement("div");
    osobyRadek.className = "tisk-osoby";
    osobyRadek.textContent = "Při " + souhrn.osoby + " osobách v autě připadá na jednoho " +
      cislo(souhrn.cenaNaOsobu, 2) + " Kč.";
    tiskSoucet.appendChild(osobyRadek);
  }
}

tiskBtn.addEventListener("click", function () {
  // přepočítáme, ať sestava odpovídá aktuálně zadaným hodnotám
  var souhrn = prepocitej();
  naplnTiskovouSestavu(souhrn);

  // obrázek mapy se skládá z dlaždic, takže tisk musí počkat, než bude hotový
  var puvodniPopis = tiskPopis.textContent;
  tiskBtn.disabled = true;
  if (souradniceTrasy().length) { tiskPopis.textContent = "Připravuji mapu do sestavy..."; }

  vytvorObrazekTrasy()
    .catch(function (chyba) {
      console.error("Obrázek mapy se nepodařilo připravit:", chyba);
      return null;
    })
    .then(nastavObrazekDoSestavy)
    .then(function () {
      tiskBtn.disabled = false;
      tiskPopis.textContent = puvodniPopis;
      window.print();
    });
});

// ---------- vykreslení seznamu bodů trasy ----------
var IKONA_START = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v3M12 19v3M2 12h3M19 12h3"></path></svg>';
var IKONA_ZASTAVKA = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="3.5"></circle><path d="M12 2v5M12 17v5"></path></svg>';
var IKONA_CIL = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>';

function roleBodu(index) {
  if (index === 0) { return "Start"; }
  if (index === body.length - 1) { return "Cíl"; }
  return "Zastávka " + index;
}

function ikonaBodu(index) {
  if (index === 0) { return IKONA_START; }
  if (index === body.length - 1) { return IKONA_CIL; }
  return IKONA_ZASTAVKA;
}

function vytvorVlozitZastavku() {
  var obal = document.createElement("div");
  obal.className = "trasa-vlozit";

  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn-link";
  btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg>';
  btn.appendChild(document.createTextNode("Přidat zastávku"));
  btn.addEventListener("click", function () {
    body.splice(body.length - 1, 0, novyBod());
    zneplatniTrasu();
    vykresliBody();
  });

  obal.appendChild(btn);
  return obal;
}

function vykresliBody() {
  trasaBodyEl.innerHTML = "";

  body.forEach(function (bod, index) {
    var radek = document.createElement("div");
    radek.className = "trasa-radek";

    // hlavička řádku: ikona + role + křížek
    var hlavicka = document.createElement("div");
    hlavicka.className = "trasa-hlavicka";

    var ikona = document.createElement("span");
    ikona.className = "trasa-ikona" + (maSouradnice(bod) ? " trasa-ikona-ok" : "");
    ikona.innerHTML = ikonaBodu(index);
    hlavicka.appendChild(ikona);

    var role = document.createElement("span");
    role.className = "trasa-role";
    role.textContent = roleBodu(index);
    hlavicka.appendChild(role);

    if (maSouradnice(bod) && bod.nazev) {
      var nazev = document.createElement("span");
      nazev.className = "trasa-nazev";
      nazev.textContent = bod.nazev;
      hlavicka.appendChild(nazev);
    }

    if (body.length > 2) {
      var odebrat = document.createElement("button");
      odebrat.type = "button";
      odebrat.className = "trasa-odebrat";
      odebrat.title = "Odebrat bod";
      odebrat.textContent = "×";
      odebrat.addEventListener("click", function () {
        odeberBod(index);
      });
      hlavicka.appendChild(odebrat);
    }

    radek.appendChild(hlavicka);

    // pole s adresou + tlačítko Najít
    var obal = document.createElement("span");
    obal.className = "field-box";

    var vstup = document.createElement("input");
    vstup.type = "text";
    vstup.value = bod.dotaz;
    vstup.placeholder = index === 0 ? "adresa nebo místo (např. Praha)"
      : (index === body.length - 1 ? "adresa nebo místo (např. Brno)" : "adresa nebo místo");
    vstup.addEventListener("input", function () {
      bod.dotaz = vstup.value;
    });
    vstup.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); najdiProBod(index); }
    });
    obal.appendChild(vstup);

    var najit = document.createElement("button");
    najit.type = "button";
    najit.className = "find-btn";
    najit.textContent = "Najít";
    najit.addEventListener("click", function () { najdiProBod(index); });
    obal.appendChild(najit);

    radek.appendChild(obal);
    trasaBodyEl.appendChild(radek);

    // nabídka vložení zastávky přesně tam, kam nový bod přibude (těsně před cíl)
    if (index === body.length - 2) {
      trasaBodyEl.appendChild(vytvorVlozitZastavku());
    }
  });

  aktualizujMarkery();
  okruhBtn.disabled = !maSouradnice(body[0]) || body.length < 2;
}

// ---------- práce s body ----------
function nastavBod(index, lat, lon, nazev, dotaz) {
  var bod = body[index];
  bod.lat = lat;
  bod.lon = lon;
  bod.nazev = nazev || "";
  if (dotaz !== undefined) { bod.dotaz = dotaz; }
  mapaHint.hidden = true;
  zneplatniTrasu();
  vykresliBody();
}

// klik do mapy doplní první bod bez souřadnic, jinak přidá nový bod na konec (= nový cíl,
// dosavadní cíl se tím posune na zastávku)
function pridejBodZMapy(lat, lon) {
  var volnyIndex = -1;
  for (var i = 0; i < body.length; i++) {
    if (!maSouradnice(body[i])) { volnyIndex = i; break; }
  }
  if (volnyIndex === -1) {
    body.push(novyBod());
    volnyIndex = body.length - 1;
  }
  nastavBod(volnyIndex, lat, lon, "z mapy", lat.toFixed(4) + ", " + lon.toFixed(4));
}

function odeberBod(index) {
  var bod = body[index];
  if (bod.marker && mapaDostupna) { mapa.removeLayer(bod.marker); }
  body.splice(index, 1);
  if (body.length < 2) { body.push(novyBod()); }
  zneplatniTrasu();
  vykresliBody();
}

// vykreslená trasa už neodpovídá bodům - schovat čáru i chipy
function zneplatniTrasu() {
  if (trasaVrstva && mapaDostupna) { mapa.removeLayer(trasaVrstva); }
  trasaVrstva = null;
  aktualniStoupani = 0;
  aktualniDobaS = 0;
  aktualniGeojson = null;
  chipDistance.hidden = true;
  chipElevation.hidden = true;
  chipDuration.hidden = true;
  chipEmpty.hidden = false;
}

function vynulujTrasu() {
  body.forEach(function (bod) {
    if (bod.marker && mapaDostupna) { mapa.removeLayer(bod.marker); }
  });
  body = [novyBod(), novyBod()];
  zneplatniTrasu();
  mapaHint.hidden = false;
  trasaInfo.textContent = "";
  vykresliBody();
}

okruhBtn.addEventListener("click", function () {
  var start = body[0];
  if (!maSouradnice(start)) {
    trasaInfo.textContent = "Nejdřív nastav start - okruh se vrací na něj.";
    return;
  }
  body.push({
    dotaz: start.dotaz,
    lat: start.lat,
    lon: start.lon,
    nazev: start.nazev || "zpět na start",
    marker: null
  });
  zneplatniTrasu();
  vykresliBody();
});

vymazatTrasu.addEventListener("click", vynulujTrasu);

// ---------- geokódování adresy (Nominatim / OpenStreetMap, zdarma, bez klíče) ----------
function najdiMisto(dotaz) {
  var url = "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(dotaz);
  return fetch(url).then(function (odpoved) {
    if (!odpoved.ok) { throw new Error("Vyhledávání se nezdařilo."); }
    return odpoved.json();
  }).then(function (vysledky) {
    if (!vysledky.length) { throw new Error('Místo "' + dotaz + '" se nenašlo.'); }
    return {
      lat: parseFloat(vysledky[0].lat),
      lon: parseFloat(vysledky[0].lon),
      nazev: vysledky[0].display_name
    };
  });
}

function najdiProBod(index) {
  var bod = body[index];
  if (!bod.dotaz.trim()) { return; }
  trasaInfo.textContent = "Hledám " + roleBodu(index).toLowerCase() + "...";
  najdiMisto(bod.dotaz).then(function (misto) {
    // Než hledání doběhne, mohl se počet bodů změnit (klik do mapy, přidání
    // zastávky) a index by ukazoval na jiný bod - držíme se proto objektu.
    var aktualniIndex = body.indexOf(bod);
    if (aktualniIndex === -1) { return; }
    nastavBod(aktualniIndex, misto.lat, misto.lon, misto.nazev);
    if (mapaDostupna) { mapa.setView([misto.lat, misto.lon], 12); }
    trasaInfo.textContent = "";
  }).catch(function (err) {
    trasaInfo.textContent = err.message;
  });
}

// ---------- routování (vzdálenost, doba jízdy, případně převýšení) ----------

// varianta bez klíče: veřejný demo server OSRM (žádné převýšení)
function trasaOSRM(souradnice) {
  var cesta = souradnice.map(function (b) { return b.lon + "," + b.lat; }).join(";");
  var url = "https://router.project-osrm.org/route/v1/driving/" + cesta + "?overview=full&geometries=geojson";
  return fetch(url).then(function (odpoved) { return odpoved.json(); }).then(function (data) {
    if (data.code !== "Ok" || !data.routes.length) { throw new Error("Trasu se nepodařilo najít (OSRM)."); }
    var route = data.routes[0];
    return {
      vzdalenostKm: route.distance / 1000,
      dobaS: route.duration,
      geojson: route.geometry,
      stoupaniM: null
    };
  });
}

// varianta s vlastním OpenRouteService klíčem: vzdálenost + doba + stoupání/klesání
function trasaORS(souradnice, klic) {
  var url = "https://api.openrouteservice.org/v2/directions/driving-car/geojson";
  return fetch(url, {
    method: "POST",
    headers: {
      "Authorization": klic,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      coordinates: souradnice.map(function (b) { return [b.lon, b.lat]; }),
      elevation: true
    })
  }).then(function (odpoved) {
    if (!odpoved.ok) { throw new Error("Trasu se nepodařilo najít (OpenRouteService) - zkontroluj klíč."); }
    return odpoved.json();
  }).then(function (data) {
    var feature = data.features[0];
    return {
      vzdalenostKm: feature.properties.summary.distance / 1000,
      dobaS: feature.properties.summary.duration,
      geojson: feature.geometry,
      stoupaniM: feature.properties.ascent || 0
    };
  });
}

function vykresliTrasuNaMape(geojson) {
  if (!mapaDostupna) { return; }
  if (trasaVrstva) { mapa.removeLayer(trasaVrstva); }
  trasaVrstva = L.geoJSON(geojson, { style: { color: "#C2603C", weight: 5 } }).addTo(mapa);
  mapa.fitBounds(trasaVrstva.getBounds(), { padding: [20, 20] });
}

vypocitatTrasu.addEventListener("click", function () {
  var chybejici = [];
  body.forEach(function (bod, index) {
    if (!maSouradnice(bod)) { chybejici.push(roleBodu(index).toLowerCase()); }
  });
  if (chybejici.length) {
    trasaInfo.textContent = "Chybí souřadnice: " + chybejici.join(", ") +
      " (klikni do mapy nebo vyhledej adresu).";
    return;
  }

  trasaInfo.textContent = "Počítám trasu...";
  var klic = orsKlic.value.trim();
  var slib = klic ? trasaORS(body, klic) : trasaOSRM(body);

  slib.then(function (vysledek) {
    aktualniGeojson = vysledek.geojson;
    vykresliTrasuNaMape(vysledek.geojson);
    vzdalenost.value = vysledek.vzdalenostKm.toFixed(1);

    chipEmpty.hidden = true;
    chipDistance.hidden = false;
    chipDistanceVal.textContent = Math.round(vysledek.vzdalenostKm) + " km";

    if (vysledek.dobaS) {
      aktualniDobaS = vysledek.dobaS;
      chipDuration.hidden = false;
      chipDurationVal.textContent = formatujCas(vysledek.dobaS);
    } else {
      aktualniDobaS = 0;
      chipDuration.hidden = true;
    }

    if (vysledek.stoupaniM !== null) {
      aktualniStoupani = vysledek.stoupaniM;
      chipElevation.hidden = false;
      chipElevationVal.textContent = "stoupání " + Math.round(vysledek.stoupaniM) + " m";
      trasaInfo.textContent = "";
    } else {
      aktualniStoupani = 0;
      chipElevation.hidden = true;
      trasaInfo.textContent = "Pro zohlednění převýšení vyplň v Upřesnění vlastní OpenRouteService klíč.";
    }
  }).catch(function (err) {
    trasaInfo.textContent = err.message;
  });
});

// ---------- mapa (Leaflet + OpenStreetMap) ----------
// Inicializace mapy je v try/catch: když se Leaflet nenačte (výpadek CDN, offline,
// blokátor), zbytek appky funguje dál - jen se nekreslí mapa ani čára trasy.
// Vyhledávání adres i výpočet vzdálenosti jedou i bez ní.
function aktualizujMarkery() {
  if (!mapaDostupna) { return; }
  body.forEach(function (bod, index) {
    if (!maSouradnice(bod)) {
      if (bod.marker) { mapa.removeLayer(bod.marker); bod.marker = null; }
      return;
    }
    if (bod.marker) {
      bod.marker.setLatLng([bod.lat, bod.lon]);
    } else {
      bod.marker = L.marker([bod.lat, bod.lon]).addTo(mapa);
    }
    bod.marker.bindPopup(roleBodu(index) + (bod.nazev ? ": " + bod.nazev : ""));
  });
}

try {
  mapa = L.map("mapa", { zoomControl: false }).setView([49.8, 15.5], 7); // střed přibližně na ČR/střední Evropu
  L.control.zoom({ position: "topright" }).addTo(mapa);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(mapa);

  mapaDostupna = true;

  mapa.on("click", function (e) {
    pridejBodZMapy(e.latlng.lat, e.latlng.lng);
  });
} catch (chyba) {
  console.error("Mapu se nepodařilo inicializovat:", chyba);
  mapaDostupna = false;
  trasaInfo.textContent = "Mapu se nepodařilo načíst (zkontroluj připojení k internetu). " +
    "Body trasy jde zadat adresou, vzdálenost se spočítá i bez mapy.";
}

vykresliBody();

// ---------- uložení ORS klíče v prohlížeči, ať ho uživatel nemusí zadávat pořád znovu ----------
(function () {
  var ulozenyKlic = localStorage.getItem("orsKlic");
  if (ulozenyKlic) { orsKlic.value = ulozenyKlic; }
  orsKlic.addEventListener("change", function () {
    localStorage.setItem("orsKlic", orsKlic.value.trim());
  });
})();
