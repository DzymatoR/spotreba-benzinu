// ---------- původní prvky kalkulačky ----------
var vzdalenost = document.querySelector("#vzdalenost");
var cena = document.querySelector("#cena");
var spotreba = document.querySelector("#spotreba");
var osoby = document.querySelector("#osoby");
var tlacitko = document.querySelector("#tlacitko");
var jednotlivec = document.querySelector("#VyraznaCenaJ");
var celkem = document.querySelector("#VyraznaCenaC");

// ---------- nové prvky (trasa / mapa) ----------
var startAdresa = document.querySelector("#startAdresa");
var cilAdresa = document.querySelector("#cilAdresa");
var najitStart = document.querySelector("#najitStart");
var najitCil = document.querySelector("#najitCil");
var vypocitatTrasu = document.querySelector("#vypocitatTrasu");
var vymazatTrasu = document.querySelector("#vymazatTrasu");
var trasaInfo = document.querySelector("#trasaInfo");
var orsKlic = document.querySelector("#orsKlic");
var zohlednitPrevyseni = document.querySelector("#zohlednitPrevyseni");
var prevyseniFactor = document.querySelector("#prevyseniFactor");
var provoz = document.querySelector("#provoz");

// stoupání aktuální trasy v metrech (naplní se jen když je k dispozici OpenRouteService klíč)
var aktualniStoupani = 0;

// ---------- výpočet ceny (rozšířený o provoz a převýšení) ----------
tlacitko.addEventListener("click", function () {
  var koeficientProvozu = Number(provoz.value) || 1;
  var efektivniSpotreba = Number(spotreba.value) * koeficientProvozu;

  var litryZaTrasu = (Number(vzdalenost.value) * efektivniSpotreba) / 100;

  var litryZaPrevyseni = 0;
  if (zohlednitPrevyseni.checked && aktualniStoupani > 0) {
    litryZaPrevyseni = (aktualniStoupani / 100) * Number(prevyseniFactor.value || 0);
  }

  var celkoveLitry = litryZaTrasu + litryZaPrevyseni;
  var vypocetSkupina = (celkoveLitry * Number(cena.value)).toFixed(2);
  var vypocetJednotlivec = (vypocetSkupina / Number(osoby.value)).toFixed(2);

  celkem.innerHTML = vypocetSkupina;
  jednotlivec.innerHTML = vypocetJednotlivec;
});

// ---------- mapa (Leaflet + OpenStreetMap) ----------
// Vše je v try/catch: pokud se Leaflet nenačte (výpadek CDN, offline, blokátor),
// zbytek stránky (uložení ORS klíče apod.) i základní kalkulačka výše zůstanou funkční.
try {

var mapa = L.map("mapa").setView([49.8, 15.5], 7); // střed přibližně na ČR/střední Evropu

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(mapa);

var startMarker = null;
var cilMarker = null;
var trasaVrstva = null; // vykreslená čára trasy

var startBod = null; // {lat, lon}
var cilBod = null;

function nastavStart(lat, lon, popisek) {
  startBod = { lat: lat, lon: lon };
  if (startMarker) {
    startMarker.setLatLng([lat, lon]);
  } else {
    startMarker = L.marker([lat, lon], { title: "Start" }).addTo(mapa);
  }
  if (popisek) {
    startMarker.bindPopup("Start: " + popisek).openPopup();
  }
}

function nastavCil(lat, lon, popisek) {
  cilBod = { lat: lat, lon: lon };
  if (cilMarker) {
    cilMarker.setLatLng([lat, lon]);
  } else {
    cilMarker = L.marker([lat, lon], { title: "Cíl" }).addTo(mapa);
  }
  if (popisek) {
    cilMarker.bindPopup("Cíl: " + popisek).openPopup();
  }
}

// klik do mapy: 1. klik = start, 2. klik = cíl, 3. klik = znovu od startu
mapa.on("click", function (e) {
  if (!startBod || (startBod && cilBod)) {
    // začínáme novou trasu
    if (startMarker) { mapa.removeLayer(startMarker); startMarker = null; }
    if (cilMarker) { mapa.removeLayer(cilMarker); cilMarker = null; }
    if (trasaVrstva) { mapa.removeLayer(trasaVrstva); trasaVrstva = null; }
    cilBod = null;
    nastavStart(e.latlng.lat, e.latlng.lng, "z mapy");
  } else {
    nastavCil(e.latlng.lat, e.latlng.lng, "z mapy");
  }
});

document.querySelector("#vymazatTrasu").addEventListener("click", function () {
  if (startMarker) { mapa.removeLayer(startMarker); startMarker = null; }
  if (cilMarker) { mapa.removeLayer(cilMarker); cilMarker = null; }
  if (trasaVrstva) { mapa.removeLayer(trasaVrstva); trasaVrstva = null; }
  startBod = null;
  cilBod = null;
  aktualniStoupani = 0;
  trasaInfo.textContent = "";
});

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

najitStart.addEventListener("click", function () {
  if (!startAdresa.value.trim()) { return; }
  trasaInfo.textContent = "Hledám start...";
  najdiMisto(startAdresa.value).then(function (misto) {
    nastavStart(misto.lat, misto.lon, misto.nazev);
    mapa.setView([misto.lat, misto.lon], 12);
    trasaInfo.textContent = "";
  }).catch(function (err) {
    trasaInfo.textContent = err.message;
  });
});

najitCil.addEventListener("click", function () {
  if (!cilAdresa.value.trim()) { return; }
  trasaInfo.textContent = "Hledám cíl...";
  najdiMisto(cilAdresa.value).then(function (misto) {
    nastavCil(misto.lat, misto.lon, misto.nazev);
    mapa.setView([misto.lat, misto.lon], 12);
    trasaInfo.textContent = "";
  }).catch(function (err) {
    trasaInfo.textContent = err.message;
  });
});

// ---------- routování (vzdálenost, případně převýšení) ----------

// varianta bez klíče: veřejný demo server OSRM (jen vzdálenost/čas, žádné převýšení)
function trasaOSRM(start, cil) {
  var url = "https://router.project-osrm.org/route/v1/driving/" +
    start.lon + "," + start.lat + ";" + cil.lon + "," + cil.lat +
    "?overview=full&geometries=geojson";
  return fetch(url).then(function (odpoved) { return odpoved.json(); }).then(function (data) {
    if (data.code !== "Ok" || !data.routes.length) { throw new Error("Trasu se nepodařilo najít (OSRM)."); }
    var route = data.routes[0];
    return {
      vzdalenostKm: route.distance / 1000,
      geojson: route.geometry,
      stoupaniM: null
    };
  });
}

// varianta s vlastním OpenRouteService klíčem: vzdálenost + stoupání/klesání
function trasaORS(start, cil, klic) {
  var url = "https://api.openrouteservice.org/v2/directions/driving-car/geojson";
  return fetch(url, {
    method: "POST",
    headers: {
      "Authorization": klic,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      coordinates: [[start.lon, start.lat], [cil.lon, cil.lat]],
      elevation: true
    })
  }).then(function (odpoved) {
    if (!odpoved.ok) { throw new Error("Trasu se nepodařilo najít (OpenRouteService) - zkontroluj klíč."); }
    return odpoved.json();
  }).then(function (data) {
    var feature = data.features[0];
    return {
      vzdalenostKm: feature.properties.summary.distance / 1000,
      geojson: feature.geometry,
      stoupaniM: feature.properties.ascent || 0
    };
  });
}

function vykresliTrasu(geojson) {
  if (trasaVrstva) { mapa.removeLayer(trasaVrstva); }
  trasaVrstva = L.geoJSON(geojson, { style: { color: "#325573", weight: 5 } }).addTo(mapa);
  mapa.fitBounds(trasaVrstva.getBounds(), { padding: [20, 20] });
}

vypocitatTrasu.addEventListener("click", function () {
  if (!startBod || !cilBod) {
    trasaInfo.textContent = "Nejdřív vyber start i cíl (kliknutím do mapy nebo vyhledáním adresy).";
    return;
  }

  trasaInfo.textContent = "Počítám trasu...";
  var klic = orsKlic.value.trim();
  var slib = klic ? trasaORS(startBod, cilBod, klic) : trasaOSRM(startBod, cilBod);

  slib.then(function (vysledek) {
    vykresliTrasu(vysledek.geojson);
    vzdalenost.value = vysledek.vzdalenostKm.toFixed(1);

    if (vysledek.stoupaniM !== null) {
      aktualniStoupani = vysledek.stoupaniM;
      trasaInfo.textContent = "Vzdálenost: " + vysledek.vzdalenostKm.toFixed(1) +
        " km, stoupání: " + Math.round(vysledek.stoupaniM) + " m.";
    } else {
      aktualniStoupani = 0;
      trasaInfo.textContent = "Vzdálenost: " + vysledek.vzdalenostKm.toFixed(1) +
        " km. (Pro zohlednění převýšení vyplň v Upřesnění vlastní OpenRouteService klíč.)";
    }
  }).catch(function (err) {
    trasaInfo.textContent = err.message;
  });
});

} catch (chyba) {
  // Leaflet se nenačetl (offline / blokovaný CDN) - mapa nebude fungovat,
  // ale zbytek kalkulačky ano.
  console.error("Mapu se nepodařilo inicializovat:", chyba);
  trasaInfo.textContent = "Mapu se nepodařilo načíst (zkontroluj připojení k internetu). " +
    "Vzdálenost lze zadat ručně níže.";
  [najitStart, najitCil, vypocitatTrasu, vymazatTrasu].forEach(function (btn) {
    btn.disabled = true;
  });
}

// ---------- uložení ORS klíče v prohlížeči, ať ho uživatel nemusí zadávat pořád znovu ----------
(function () {
  var ulozenyKlic = localStorage.getItem("orsKlic");
  if (ulozenyKlic) { orsKlic.value = ulozenyKlic; }
  orsKlic.addEventListener("change", function () {
    localStorage.setItem("orsKlic", orsKlic.value.trim());
  });
})();
