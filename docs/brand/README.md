# Marca Zentlet

<img src="logo/png/zentlet-horizontal-1600.png" alt="Logo de Zentlet: un tallo de bambú crema sobre un recuadro jade, junto a la palabra Zentlet" width="420"/>

## La idea

**Primero construyes la base → después acumulas capital → luego haces crecer y diversificas ese capital.**

El bambú crece así: nudo a nudo, cada tramo sobre el anterior, y sólo arriba se abre en hojas. El tallo cruza el recuadro en diagonal, siempre hacia arriba, y sale por el borde inferior: la base ya está construida y el crecimiento continúa.

- **Nudos** → la base y el capital que se acumula.
- **Hojas** → el crecimiento y la diversificación.
- **Jade y crema** → calma, constancia, dinero sin estrés.

## Archivos

Todo vive en [`logo/`](logo/). Los SVG son los originales; los PNG, exportaciones.

| Archivo | Uso |
|---|---|
| `svg/zentlet-symbol.svg` | Símbolo principal (recuadro jade). Avatares, redes, cabeceras. |
| `svg/zentlet-symbol-small.svg` | Corte para tamaños pequeños (≤ 32 px): tallo más grueso, dos hojas. Favicon. |
| `svg/zentlet-app-icon.svg` | Icono a sangre (cuadrado completo) para iOS y Android maskable. |
| `svg/zentlet-horizontal.svg` · `-reversed` · `-black` | Lockup horizontal sobre claro, sobre oscuro y a una tinta. |
| `svg/zentlet-stacked.svg` · `-reversed` | Lockup apilado. |
| `svg/zentlet-wordmark.svg` · `-white` | Sólo la palabra. |
| `svg/zentlet-mark.svg` · `-black` · `-white` | El bambú sin recuadro, para fondos claros o grabados. |
| `svg/zentlet-symbol-mono-black.svg` · `-mono-jade.svg` | Símbolo a una tinta (fax, sellos, bordado, impresión a un color). |
| `png/*` | PNG listos (símbolo e icono a 1024 px, lockups). |

En la app, el símbolo es el componente [`BrandMark`](../../src/core/components/brand-mark.tsx) y los iconos están en `public/icons/` y `src/app/` (`favicon.ico`, `icon.png`).

## Color

| Nombre | HEX | RGB | Uso |
|---|---|---|---|
| **Jade** | `#034a2e` | 3 · 74 · 46 | Recuadro del símbolo. Color principal de marca. |
| **Crema** | `#f6f2e3` | 246 · 242 · 227 | Tallo; wordmark sobre fondos oscuros. |
| **Hoja** | `#60c473` | 96 · 196 · 115 | Hojas. Sólo dentro del símbolo, nunca para texto. |
| **Tinta** | `#191820` | 25 · 24 · 32 | Wordmark sobre fondos claros (es el `--app-fg` de la app). |

Contraste (WCAG): crema sobre jade 9.3:1 · jade sobre el fondo de la app 9.6:1 · tinta sobre el fondo de la app 16.4:1 · hoja sobre jade 4.8:1.

En CSS: `--brand-jade`, `--brand-cream`, `--brand-leaf` (en `src/app/globals.css`). Para impresión, pedir a la imprenta la conversión CMYK/Pantone desde estos HEX y validarla con una prueba física.

La marca no reemplaza la paleta de la app: el rojo sigue siendo gasto y el verde ingreso.

## Tipografía

El wordmark es **Nunito ExtraBold (800)** convertido a trazos, con un tracking de −2 %. Nunito usa la [SIL Open Font License 1.1](https://openfontlicense.org), que permite usarla en logos. En los archivos no hay texto vivo, así que no hace falta instalar la fuente para usarlos.

En la interfaz, el nombre junto al símbolo usa la fuente redondeada del sistema (`--font-display`), que es la de toda la app.

## Reglas de uso

- **Espacio libre:** deja alrededor del logo al menos **¼ del ancho del símbolo** sin otros elementos.
- **Tamaños mínimos:** símbolo 16 px (por debajo de 32 px usa `zentlet-symbol-small.svg`); lockup horizontal 96 px de ancho; impreso, símbolo de 8 mm.
- **Fondos:** sobre claro usa `zentlet-horizontal.svg`; sobre oscuro o fotos, `-reversed`. Si el fondo es jade, usa el símbolo a una tinta crema.
- **No hacer:**
  - Cambiar los colores, añadir degradados, sombras o contornos.
  - Girar, enderezar o reflejar el bambú (la diagonal hacia arriba es la idea).
  - Separar las hojas del tallo o quitar nudos.
  - Estirar o deformar el logo, o reescribir "Zentlet" con otra fuente.
  - Poner el símbolo sin recuadro sobre fondos con poco contraste.

## Pendiente

- **Registro de marca:** no hay garantía de que el nombre y el símbolo estén libres. Antes de registrar, haz una búsqueda profesional (INDECOPI en Perú, la oficina de cada país donde operes y la base TMview/WIPO) y una búsqueda inversa de imagen.
- Validar las conversiones CMYK/Pantone con una prueba de impresión.

## Registro de la exploración

Las rondas de conceptos se conservan en [`concepts/`](concepts/) como registro del proceso:

| Ronda | Dirección | Archivo |
|---|---|---|
| 1 | Z como letra (burbuja, z punto, balance, voz, trazo) | `concepts/concepts.png` |
| 2 | Símbolos (piedras, guijarro zen, ticket, gota, bolsillo) | `concepts/round2/concepts-round2.png` |
| 3 | Balancín, bonsái, barco de papel, gato zen, mariposa | `concepts/round3/concepts-round3.png` |
| 4 | Abstractos (círculo desplazado, jardín zen, abanico, bambú, koi) | `concepts/round4/concepts-round4.png` |
| 5 | Bambú: base → acumular → crecer y diversificar | `concepts/round5/concepts-round5.png` |
| 5 · color | Seis paletas de la opción C; elegida **jade + crema** | `concepts/round5/color/color-c.png` |

En los conceptos, el texto "Zentlet" se escribió con SF Pro Rounded sólo para explorar. Esa fuente no tiene licencia para logos y no se usa en la marca final.
