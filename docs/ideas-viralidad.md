# Topadero: 10 ideas para que se comparta, se rete y crezca

**Fecha**: 2026-06-25
**Cómo se generó**: ideación multi-agente (mismo proceso que `ideas-diferenciadoras.md`). 7 lentes de viralidad/social generaron 35 ideas, consolidadas a 23, puntuadas por un panel de 3 jueces (growth · escéptico-serverless · craft) y sintetizadas en este top 10.

El hilo común es la restricción que las hace todas viables: **no hay servidor ni multijugador en tiempo real**, así que lo social es asíncrono y sin servidor. El determinismo lo habilita: una run se empaqueta como `seed + replay de inputs` (unos KB) en una URL, código o fichero; quien lo recibe abre el enlace y juega el reto exacto en el navegador, sin cuenta ni instalación. Friccion cero para el que recibe. Ordenadas de más a menos potente.

---

## 1. Clip de Pifia
*El fallo épico se autoedita y se comparte solo: el fracaso es más viral que el récord.*

Cuando te estrellas de forma espectacular (caída larga, knockback brutal del péndulo, casi-meta), el cliente detecta el pico de drama, reproduce esos 3-5 s desde el replay determinista y los graba con MediaRecorder. Sale un clip vertical en bucle con sello tipo "TOPO VOLADOR" y un QR al reto exacto.

- **Qué se comparte**: un WebM/GIF vertical con marca de agua y QR + código de la seed incrustados; el enlace al replay completo va en la caption del share-sheet. El receptor no ve un vídeo cualquiera, ve un reto que puede tocar.
- **Por qué es viral**: el fallo da risa y se comparte sin pudor (autodespectivo, no presuntuoso), dispara mucho más que un récord. Quien ríe escanea el QR, va a probar el obstáculo cabrón, casi seguro tiene su propio vuelo y lo sube. El bucle se alimenta del fracaso, que es abundante.
- **Encaje serverless**: el knockback ya vive en el sim determinista, detectar el pico y re-renderizar esos fotogramas es local; la grabación es del navegador. La seed va en el QR y el replay en el fragmento # de la caption. Cero servidor.
- **Viabilidad**: serverless.

## 2. Cartel-Reto
*La tarjeta que ES el enlace: presumir y portal jugable en el mismo objeto.*

Al cruzar la meta el juego pinta una tarjeta candy con tu blob, tu tiempo y tu línea sobre el minimapa, rematada con un QR grande que codifica la URL con seed + inputs de tu run exacta. Dos versiones: imagen fija para el link preview y un clip de 5-6 s ("¿lo bates?") para Stories y Shorts.

- **Qué se comparte**: un PNG 1080x1920 o 1200x630 (y opcionalmente el clip vertical), con el QR que lleva seed + replay comprimido (deflate del stream de inputs, unos KB) en el hash. En texto, código corto + enlace al portapapeles.
- **Por qué es viral**: la gente ya comparte capturas y stories, friccion cero para publicar. El receptor apunta la cámara nativa, abre el reto y corre contra tu fantasma; si lo bate, su navegador genera SU tarjeta y la vuelve a soltar. Viaja por canales donde un texto-enlace muere.
- **Encaje serverless**: la tarjeta se pinta en canvas con el estado de la sim al cruzar meta; el QR lo genera una lib JS; la URL embebida vive en el fragmento #. (Una preview rica por seed sería el único punto que pediría un edge worker; aquí no hace falta.)
- **Viabilidad**: serverless.

## 3. Cuadrícula del Día
*El resultado tipo Wordle que se pega solo en cualquier chat, sin destripar la pista.*

Al terminar la pista diaria (seed derivado de la fecha) el juego genera una cuadrícula de texto/emoji spoiler-free: una fila por sector con bloques de color según tu margen contra el par, más tu tiempo y la fecha. Se copia al portapapeles de un toque y se pega tal cual en WhatsApp, X o el grupo.

- **Qué se comparte**: un bloque de texto/emoji autogenerado (cuadrícula por sectores + tiempo + fecha) y una línea-enlace que deriva el seed de la fecha. Sin imágenes, pegable donde sea.
- **Por qué es viral**: compartir es el cierre natural del daily, ganes o falles, y no presiona a nadie. Quien lo ve siente comparación directa ("yo hice mejor el sector 3") y toca el enlace para jugar la misma pista en cinco segundos. Es el bucle Wordle puro, con un momento de compartir cada día. La novedad no es "hacer un daily" sino que el resultado es un artefacto de texto auto-pegable y spoiler-free.
- **Encaje serverless**: el seed sale de la fecha, no hay que almacenar la pista; la cuadrícula se construye en cliente desde tu run; el enlace no requiere lookup porque la fecha ES la clave.
- **Viabilidad**: serverless.

## 4. Reto Instantáneo
*El enlace es el reto: estás corriendo antes de entender que lo aceptaste.*

El enlace de reto no abre menú ni bienvenida: carga el circuito con el seed exacto y te suelta en la salida, cronómetro a cero y tiempo a batir flotando sobre la meta. Para el escéptico, lo primero puede ser una probadita jugable (el primer tramo en bucle, el blob ya respondiendo a sus dedos mientras lee "reto de Marta: 0:51"), para que sienta el control afinado, que es la USP, antes de comprometerse.

- **Qué se comparte**: una URL auto-jugable con todo embebido en el fragment (`#c=seedBase62.tiempoObjetivo.circuitoId`), copia al portapapeles de un toque y `navigator.share` que adjunta "Bate mi 0:42 en Topadero".
- **Por qué es viral**: en las dos direcciones. El receptor pasa de pestaña a movimiento sin fricción (cero clics, cero cuenta, cero instalación) y la demo mata la objeción "otro juego que aprender"; el que juega choca con el muro del tiempo del retador, repite por testarudez y al ganar reenvía el mismo enlace con su nuevo tiempo. Rebota entre dos y luego se abre en abanico.
- **Encaje serverless**: todo el estado cabe en el hash y se decodifica al cargar index.html en Pages; el determinismo garantiza que el circuito de ese seed es bit-exacto para el receptor. La demo es el mismo circuito recortado al primer tramo, en cliente. No se sirve ni se guarda nada por jugador.
- **Viabilidad**: serverless.

## 5. Código de Pista
*Un guante corto y pronunciable lanzado a todo un grupo a la vez.*

Un código tipo `TOPA-9F3K` que no guarda la run de nadie: codifica el seed que genera el circuito más los parámetros del reto (mutadores, vuelta objetivo, tiempo a batir). Lo dices en voz alta en un directo, lo pegas en un comentario o lo enseñas como QR en pantalla. Quien lo teclea o escanea entra a exactamente el mismo circuito a fijar su tiempo.

- **Qué se comparte**: una cadena alfanumérica de 8-10 caracteres (seed + circuitId + bits de config + tiempo objetivo) o el QR equivalente. Pegable en chat, dictable de viva voz, proyectable. No incluye replay, solo el reto y la marca a superar.
- **Por qué es viral**: formato 1:muchos. Un streamer o un grupo lanza "el código de hoy, batid esto" y todos compiten en condiciones idénticas gracias al seed, sin pisarse. Cada quien comparte su tiempo (captura o Cartel-Reto) y eso pica al siguiente.
- **Encaje serverless**: seed + config + tiempo son datos diminutos, caben en un código corto o un QR fiable, sin almacenamiento. Aviso honesto: cargar el fantasma concreto de una persona desde un código tan corto exigiría guardar el replay (eso sería necesita-backend-ligero); aquí el código es la semilla y el fantasma viaja aparte por URL o tarjeta cuando hace falta.
- **Viabilidad**: serverless.

## 6. Sello de Récord
*El tiempo que se demuestra en el mismo gesto en que lo presumes. Imposible mentir.*

Cada mejor marca (o cada galón: Sub-30 del día, racha de 7 dailies, "limpio sin caídas") se exporta como un Sello: una URL corta que lleva dentro el seed y el replay de inputs. Quien la abre no ve un número, su navegador reproduce el run bit a bit y le pone un check verde de "verificado" cuando el cronómetro reproducido cuadra con el tiempo reclamado.

- **Qué se comparte**: una URL corta (o insignia PNG con escudo) que codifica seed + replay comprimido (unos KB); al abrirla el juego revalida en local y muestra el tiempo con sello "verificado bit a bit". Para los galones, la insignia embebe el replay que justifica el logro.
- **Por qué es viral**: presumir y demostrar son lo mismo, el farol muere. Bates tu marca o desbloqueas un galón difícil, sueltas el Sello, y quien lo recibe ve la verificación en vivo sin cuenta ni instalar, le pica perseguir lo mismo y aterriza en ese circuito con un botón de "intentar batirlo". Los galones raros son moneda de prestigio infalsificable.
- **Encaje serverless**: seed + inputs viajan en la URL y el determinismo permite revalidar el tiempo en el cliente del receptor; nadie necesita confiar en un servidor porque cualquiera puede reproducir y comprobar. Solo un rango canónico global único pediría backend ligero; los Sellos autocertificados cubren el estatus sin servidor.
- **Viabilidad**: serverless.

## 7. El Guante
*Duelo 1:1 por DM en el que responder genera, sin pasos extra, el contraataque.*

Acabas una run y pulsas "Arrojar el guante": el juego copia al portapapeles tu replay bit-exacto y abre el share-sheet para mandarlo a una persona. Quien lo recibe ve tu fantasma como liebre y corre el mismo circuito; al terminar, su pantalla de resultado ya trae montado el guante de vuelta (su replay nuevo) con un solo botón para devolvértelo por el mismo chat.

- **Qué se comparte**: un enlace con el replay en el fragmento (`#g=` base64 de 1-2 KB: circuitId + cambios de eje + edges con timestamps). La devolución es otro enlace del mismo formato generado en la pantalla de fin.
- **Por qué es viral**: el bucle se cierra solo, sin notificación: la pantalla de resultado del receptor PRE-COMPONE la respuesta y la enruta al mismo hilo con un toque. Cada mensaje trae a la vez el veredicto (lo batiste o no) y el contraataque listo, así que el ida y vuelta no se enfría. Su límite es el fan-out 1:1, sostiene pero no expande por sí solo.
- **Encaje serverless**: el replay es el input stream del sim determinista (unos KB) y viaja entero en el fragmento de la URL. El receptor instancia una segunda Simulation headless con ese stream como liebre y juega su run en la primera. El fragmento # ni siquiera llega a un host estático.
- **Viabilidad**: serverless.

## 8. El Reto Hidra
*El enlace se endurece al ganarlo, así que ganar te obliga (por mecánica) a reenviarlo.*

Cada enlace lleva el fantasma del retador en el fragmento. Quien lo recibe abre directo a una run contra esa liebre bit-exacta; si le gana, su navegador reescribe el enlace para que ahora cargue SU fantasma (más rápido) y le ofrece "pasa el reto". El artefacto se vuelve más difícil con cada victoria.

- **Qué se comparte**: una URL de reto con el replay del retador en el fragmento #; al ganar, el cliente genera automáticamente la siguiente URL con el replay del nuevo ganador y abre el share-sheet. El enlace presume de cuántos cayeron antes.
- **Por qué es viral**: recibir es jugar en cinco segundos y ganar genera el siguiente enlace solo; el receptor se convierte en emisor por la propia mecánica, no por voluntad. La dificultad creciente es el motor de propagación, el cierre menos voluntario del lote. Riesgo a vigilar: si el fantasma se vuelve inalcanzable demasiado pronto, la cadena se rompe; hay que calibrar el endurecimiento.
- **Encaje serverless**: todo viaja en el fragmento #, que nunca llega a un servidor; el determinismo garantiza que el replay reproduce la trayectoria exacta en cualquier navegador. Cero storage.
- **Viabilidad**: serverless.

## 9. El Amuleto Heredado
*Un mutador con personalidad que pasa de un desconocido a otro, como herencia anónima.*

El daily entrega a cada jugador un amuleto determinista por fecha-semilla: un mutador con carácter (gravedad lunar, suelo de hielo, topo gigante). Tras tu run puedes legarlo a otra persona con un mensaje, y ella lo recibe como herencia de alguien que no conoce: "alguien que jugó el martes te deja el suelo resbaladizo, suerte". No se compra ni se elige, solo se hereda.

- **Qué se comparte**: un enlace o QR que abre el circuito del día con un mutador concreto activado y una nota corta del legador (apodo + frase). Como mutador y circuito se derivan de la fecha, el artefacto solo transporta el id del mutador y el mensaje.
- **Por qué es viral**: el gancho emocional. La herencia entre desconocidos es una invitación personal, no un alarde. Recibes el amuleto, juegas el daily con esa regla rara, y al terminar el juego te deja legar TU amuleto a otra persona. Cada legado siembra cadena. La novedad está en el gesto de heredar a ciegas; hay que enseñarlo bien para que el mutador se sienta regalo, no castigo.
- **Encaje serverless**: circuito y catálogo de mutadores salen deterministamente de la fecha; los mutadores son flags aplicadas en cliente dentro del paso fijo (deterministas, el test de FPS los cubre). Cero estado de servidor.
- **Viabilidad**: serverless.

## 10. Archivo .topadero
*El reto coleccionable que se reenvía como fichero y no tiene techo de tamaño.*

Exporta tu run como un binario diminuto `.topadero` (seed, versión de física e inputs comprimidos). Es un objeto de archivo de verdad: lo adjuntas en Discord, lo mandas por Telegram, lo guardas en una carpeta de "mis mejores vueltas". Al abrirlo o arrastrarlo a la web carga el reto exacto con tu fantasma de liebre.

- **Qué se comparte**: un fichero de unos pocos KB (seed + simVersion + stream de inputs comprimido, con cabecera legible de tiempo y circuito), arbitrariamente grande si hace falta, porque el carrier es un adjunto y no una URL.
- **Por qué es viral**: vive en los canales donde la gente comparte ficheros sin pensarlo. El receptor arrastra el `.topadero` a la página y juega al instante, sin cuenta; al ser fichero se reenvía en cadena, se archiva y se colecciona. Su pega es la fricción de recepción (descargar y arrastrar) frente a un link, por eso es el complemento para runs largas o multivuelta que ya no caben en un enlace, no el vector de masas.
- **Encaje serverless**: el fichero se genera con un Blob en cliente y se descarga; la carga es 100% local (FileReader + descompresión + replay determinista). Ningún servidor toca el contenido. La PWA en alcance puede declarar `file_handlers` en el manifest como mejora, pero el receptor sin PWA solo suelta el archivo en la web.
- **Viabilidad**: serverless.

---

## Por dónde empezar

Antes que cualquier idea, prototipa el sustrato que todas comparten: `seed + replay de inputs` codificados en el hash de la URL y decodificados al cargar. Reto Instantáneo, El Guante, el Hidra y el Sello viven sobre esa base; sin ella ninguna existe.

Lo primero que sacaría a la calle es la **Cuadrícula del Día**: máximo bucle por mínimo coste, sin canvas, sin QR, sin vídeo, solo texto al portapapeles, y con un momento de compartir cada día garantizado por la fecha-semilla. Es lo más cerca de 100% serverless y lo más rápido de validar.

La apuesta a largo plazo es el **Sello de Récord**. La verificación bit a bit no la puede clonar nadie sin tu motor determinista: es el foso. Convierte la USP técnica (mismo input, misma trayectoria) en algo que el jugador toca y entiende, y hace que todo el estatus del juego (récords, galones, picas) sea honesto sin pedir jamás un servidor.
