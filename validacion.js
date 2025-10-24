/* 
   a) Numéricas (una o más cifras), separadas opcionalmente por espacios.
   b) Texto de cualquier longitud.
   c) Texto que inicie SOLO con mayúscula (el resto en minúsculas).
   d) Permite dobles consonantes “cc”, “ll”, “rr”.
   e) Prohíbe dobles vocales iguales salvo “ee” y “oo”.
   f) No permite mezclar letras y números en la misma cadena.
   g) No permite mayúsculas/minúsculas alternadas (solo la primera mayúscula, el resto minúsculas).
   h) Debe terminar con “.” (punto final).
   i) No reconoce caracteres especiales: #[]¡?¿!$%&/()={}*-+/
   j) Acepta signos de puntuación , ; :
*/

(() => {
  "use strict";

  // ----- Query de elementos -----
  const $ = (sel, ctx = document) => ctx.querySelector(sel);

  const $textarea         = $("#cadenas");
  const $btnComprobar     = $("#btn-comprobar");
  const $btnLimpiar       = $("#btn-limpiar");
  const $listaAceptadas   = $("#lista-aceptadas");
  const $listaRechazadas  = $("#lista-rechazadas");
  const $countAceptadas   = $("#count-aceptadas");
  const $countRechazadas  = $("#count-rechazadas");
  const $emptyAceptadas   = $("#empty-aceptadas");
  const $emptyRechazadas  = $("#empty-rechazadas");

  // ----- Utilidades -----
  const trimRight = (s) => s.replace(/\s+$/u, ""); // sin espacios al final
  const isEmpty   = (s) => /^\s*$/u.test(s);

  const splitNonEmptyLines = (text) =>
    text.split(/\r?\n/u).map(l => l.trim()).filter(l => l.length > 0);

  const setBtnLabel = () => {
    const n = splitNonEmptyLines($textarea.value).length;
    $btnComprobar.textContent = n === 1
      ? $btnComprobar.dataset.singular || "Comprobar cadena"
      : $btnComprobar.dataset.plural   || "Comprobar cadenas";
  };

  const resetResults = () => {
    $listaAceptadas.innerHTML  = "";
    $listaRechazadas.innerHTML = "";
    $countAceptadas.textContent  = "0";
    $countRechazadas.textContent = "0";
    $emptyAceptadas.style.display  = "";
    $emptyRechazadas.style.display = "";
  };

  const pushItem = (ul, text) => {
    const li = document.createElement("li");
    // Seguridad: textContent evita inyecciones
    li.textContent = text;
    ul.appendChild(li);
  };

  const toggleEmptyStates = () => {
    $emptyAceptadas.style.display  = $listaAceptadas.children.length  ? "none" : "";
    $emptyRechazadas.style.display = $listaRechazadas.children.length ? "none" : "";
    $countAceptadas.textContent  = String($listaAceptadas.children.length);
    $countRechazadas.textContent = String($listaRechazadas.children.length);
  };

  // ----- Lógica de validación -----
  // Conjuntos y regex base
  const UPPER  = "A-ZÑ";
  const LOWER  = "a-zñ";
  const LETTER_ANY = /[A-Za-zÑñ]/u;
  const DIGIT      = /\d/u;

  // Caracteres permitidos en TEXTO después de la primera letra:
  // - minúsculas (a–z, ñ)
  // - espacios
  // - signos , ; :
  const TEXT_ALLOWED_REST = new RegExp(`^[${LOWER}\\s,;:]*$`, "u");

  // Caracteres prohibidos en general (aparecer fuera de la lógica num/texto):
  // #[]¡?¿!$%&/()={}*-+/
  // Nota: el "." se valida por separado como terminador.
  const FORBIDDEN_CHARS = /[#\[\]¡\?¿!$%&\/()={}\*\-\+\/]/u;

  // 1) Debe terminar con un punto "." (punto final). Permitimos espacios ANTES del punto,
  //    pero NO después (el punto debe ser el último carácter no-espacio).
  function stripFinalDot(raw) {
    if (isEmpty(raw)) return { ok: false, core: "" };
    const rightTrim = trimRight(raw);
    if (!rightTrim.endsWith(".")) return { ok: false, core: "" };
    const core = rightTrim.slice(0, -1); // sin el punto final
    // No se permiten más puntos en el cuerpo:
    if (core.includes(".")) return { ok: false, core: "" };
    return { ok: true, core };
  }

  // 2) Cadena NUMÉRICA: solo dígitos y espacios (al menos un dígito).
  function isNumericCore(core) {
    // Si contiene letras, no es numérica
    if (LETTER_ANY.test(core)) return false;
    // Solo dígitos y espacios
    if (!/^[\d\s]+$/u.test(core)) return false;
    // Al menos un dígito
    return /\d/u.test(core);
  }

  // 3) Cadena de TEXTO según reglas:
  function isTextCore(core) {
    // No debe contener dígitos
    if (DIGIT.test(core)) return false;
    // No debe contener caracteres prohibidos
    if (FORBIDDEN_CHARS.test(core)) return false;

    // Permitimos espacios iniciales, pero la PRIMERA letra no-espacio debe ser mayúscula [A-ZÑ]
    const leadingSpacesMatch = core.match(/^\s*/u);
    const startIdx = leadingSpacesMatch ? leadingSpacesMatch[0].length : 0;
    const firstChar = core[startIdx];
    if (!firstChar || !new RegExp(`[${UPPER}]`, "u").test(firstChar)) {
      return false;
    }

    // El resto (después de la primera letra no-espacio) no debe contener mayúsculas
    const rest = core.slice(startIdx + 1);

    // Solo minúsculas, espacios, y , ; :
    if (!TEXT_ALLOWED_REST.test(rest)) return false;

    // Prohibir dobles vocales iguales, EXCEPTO "ee" y "oo".
    // Vocales consideradas: a, e, i, o, u  (minúsculas)
    // Permitidas: "ee" y "oo". Prohibidas: "aa", "ii", "uu".
    // NOTA: No consideramos acentos; la especificación original no los incluye.
    const lowered = rest; // ya esperamos minúsculas en 'rest'
    if (/(aa|ii|uu)/u.test(lowered)) return false;

    // Ya permitimos 'ee' y 'oo' implícitamente (no se prohíben).

    // Si pasó todo: es texto válido
    return true;
  }

  // 4) Chequeo maestro que combina todo (incluye regla f: no mezclar letras y números).
  function validarCadena(cadena) {
    // Regla h) termina con '.'
    const { ok, core } = stripFinalDot(cadena);
    if (!ok) return false;

    // Si tiene letras y números mezclados, falla (f)
    const hasLetter = LETTER_ANY.test(core);
    const hasDigit  = DIGIT.test(core);
    if (hasLetter && hasDigit) return false;

    // Si solo números/espacios -> numérica
    if (isNumericCore(core)) return true;

    // Si hay letras -> debe ser texto válido
    if (hasLetter) {
      return isTextCore(core);
    }

    // Si no hay ni letras ni dígitos (solo espacios y/o ,;:) -> no válido
    return false;
  }

  // ----- Eventos UI -----
  $textarea?.addEventListener("input", setBtnLabel);

  $btnComprobar?.addEventListener("click", () => {
    resetResults();

    const lineas = splitNonEmptyLines($textarea.value);
    lineas.forEach((linea) => {
      const aceptada = validarCadena(linea);
      if (aceptada) pushItem($listaAceptadas, linea);
      else          pushItem($listaRechazadas, linea);
    });

    toggleEmptyStates();
  });

  $btnLimpiar?.addEventListener("click", () => {
    $textarea.value = "";
    setBtnLabel();
    resetResults();
  });

  // Init label
  setBtnLabel();
})();