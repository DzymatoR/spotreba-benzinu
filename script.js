var vzdalenost = document.querySelector("#vzdalenost");
var cena = document.querySelector("#cena");
var spotreba = document.querySelector("#spotreba");
var osoby = document.querySelector("#osoby");
var tlacitko = document.querySelector("#tlacitko");
var jednotlivec = document.querySelector("#VyraznaCenaJ");
var celkem = document.querySelector("#VyraznaCenaC");

var vypocetJednotlivec;
var vypocetSkupina;

tlacitko.addEventListener("click", function(){
  vypocetSkupina = (Number(vzdalenost.value) * ((Number(cena.value) * Number(spotreba.value))/100)).toFixed(2);
  vypocetJednotlivec = (vypocetSkupina / Number(osoby.value)).toFixed(2);

  celkem.innerHTML = vypocetSkupina;
  jednotlivec.innerHTML = vypocetJednotlivec;

tlacitko.va


})
