// Test «¿Qué puede hacer solo tu hijo a su edad?» — los textos de cada idioma vienen en window.TEST
(function () {
  var T = window.TEST;
  if (!T) return;
  var edad = null, banda = null;
  var $ = function (id) { return document.getElementById(id); };
  var pasos = document.querySelectorAll(".test-paso");

  function bandaDe(e) { return e <= 4 ? "3-4" : e <= 6 ? "5-6" : e <= 8 ? "7-8" : "9-10"; }
  function siguienteBanda(b) { return { "3-4": "5-6", "5-6": "7-8", "7-8": "9-10" }[b]; }
  function nombre() { return ($("test-nombre").value || "").trim(); }
  function quien() { return nombre() || T.tuHijo; }
  function mayus(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function ir(n) {
    pasos.forEach(function (p) { p.hidden = p.getAttribute("data-paso") !== String(n); });
    $("test").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  document.querySelectorAll("[data-edad]").forEach(function (b) {
    b.addEventListener("click", function () {
      edad = +b.getAttribute("data-edad");
      banda = bandaDe(edad);
      document.querySelectorAll("[data-edad]").forEach(function (x) { x.classList.toggle("activo", x === b); });
      document.querySelector(".test-quien").textContent = quien();
      $("test-lista").innerHTML = T.tareas[banda].map(function (t, i) {
        return '<li><label><input type="checkbox" value="' + i + '"><span>' + t + "</span></label></li>";
      }).join("");
      ir(2);
    });
  });
  document.querySelectorAll("[data-volver]").forEach(function (b) {
    b.addEventListener("click", function () { ir(b.getAttribute("data-volver")); });
  });

  var practicar = [];
  $("test-ver").addEventListener("click", function () {
    var lista = T.tareas[banda];
    var hechas = [].slice.call($("test-lista").querySelectorAll("input:checked")).map(function (c) { return +c.value; });
    var faltan = lista.filter(function (_, i) { return hechas.indexOf(i) < 0; });
    var n = hechas.length;
    var r = T.resultados.filter(function (x) { return n <= x.hasta; })[0];
    $("test-num").textContent = n;
    $("test-de").textContent = T.de + " " + lista.length;
    $("test-titulo").textContent = r.titulo;
    $("test-mensaje").textContent = r.mensaje.replace("{n}", quien()).replace("{N}", mayus(quien()));
    var sig = siguienteBanda(banda);
    practicar = faltan.slice(0, 2);
    if (practicar.length < 2 && sig) practicar = practicar.concat(T.tareas[sig].slice(0, 2 - practicar.length));
    if (!practicar.length) practicar = lista.slice(-2);
    $("test-practicar").innerHTML = practicar.map(function (t) { return "<li>" + t + "</li>"; }).join("");
    var anillo = $("test-anillo"), largo = 2 * Math.PI * 52;
    anillo.style.strokeDasharray = largo;
    anillo.style.strokeDashoffset = largo;
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      anillo.style.strokeDashoffset = largo * (1 - n / lista.length);
    }); });
    var url = location.href.split("#")[0];
    $("test-compartir").href = "https://wa.me/?text=" + encodeURIComponent(T.compartir + url);
    armarHoja(lista);
    ir(3);
  });

  // Tabla para imprimir: las tareas que practican primero y luego las de su edad
  function armarHoja(lista) {
    var filas = practicar.concat(lista.filter(function (t) { return practicar.indexOf(t) < 0; })).slice(0, 7);
    var titulo = nombre() ? T.tituloHoja.replace("{n}", nombre()) : T.tituloHojaSin;
    $("test-hoja").innerHTML =
      '<div class="hoja-cabeza"><img src="assets/sello.png" alt=""><h1>' + titulo + "</h1></div>" +
      "<table><thead><tr><th></th>" + T.dias.map(function (d) { return "<th>" + d + "</th>"; }).join("") + "</tr></thead><tbody>" +
      filas.map(function (t, i) {
        return '<tr class="' + (i < practicar.length ? "nueva" : "") + '"><td>' + (i < practicar.length ? "★ " : "") + t + "</td>" +
          T.dias.map(function () { return "<td></td>"; }).join("") + "</tr>";
      }).join("") + "</tbody></table><p class=\"hoja-pie\">" + T.pieHoja + "</p>";
  }
  $("test-imprimir").addEventListener("click", function () { window.print(); });
})();
