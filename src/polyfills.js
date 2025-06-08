// Declarar global primeiro para evitar erro de eslint
/* eslint-disable no-use-before-define */
var global;

// Polyfill para resolver erro 'browser is not defined'
if (typeof window !== "undefined") {
  // Fix para browser object (usado por algumas bibliotecas)
  if (typeof window.browser === "undefined") {
    window.browser = window.chrome || {};
  }

  // Fix para global object
  if (typeof window.global === "undefined") {
    window.global = window;
  }

  // Fix específico para PDF.js e pdf-lib
  if (typeof window.process === "undefined") {
    window.process = { env: {} };
  }

  // Definir global
  global = window;
} else {
  // Fallback para ambiente Node.js
  if (typeof global === "undefined") {
    global = {};
  }
}

// Suppress console errors relacionados ao browser object
const originalError = console.error;
console.error = (...args) => {
  // Filtrar erros específicos do browser object
  if (
    args[0] &&
    typeof args[0] === "string" &&
    args[0].includes("browser is not defined")
  ) {
    return; // Ignorar este erro específico
  }
  originalError.apply(console, args);
};

// Criar variável antes de exportar para satisfazer eslint
const polyfills = {};
export default polyfills;
