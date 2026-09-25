/**
 * Aplica el tema persistido antes del primer paint para evitar el parpadeo
 * blanco al recargar en modo oscuro. Se inyecta como script en línea a
 * propósito: un script externo llega tarde.
 */
export const CLAVE_TEMA = 'mrh:tema';

export const scriptTema = `(function(){try{var t=localStorage.getItem('${CLAVE_TEMA}');if(t!=='claro'&&t!=='oscuro'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'oscuro':'claro';}document.documentElement.setAttribute('data-theme',t==='oscuro'?'dark':'light');}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;
