# Fixture `.3mf`

Fixture ridotte per i test dell'import `.3mf` (T5.3.1). **Non sono file stampabili:** contengono solo i metadati necessari al parser.

## Cosa contengono

- `Metadata/slice_info.config` — header dello slicer, piatti, `prediction`, `weight`, filamenti.
- `Metadata/project_settings.config` — `printer_model`, `printer_settings_id`, `filament_type`, colori, densità e diametro.
- `Metadata/model_settings.config` — piatti, nomi degli oggetti, riferimenti al G-code.
- `Metadata/plate_N.json` — bbox e filamenti del piatto, quando presente nell'originale.
- `[Content_Types].xml`, `_rels/.rels` e un `3D/3dmodel.model` minimo con il metadata `Application`.
- `_rels/.rels` è stato ridotto alla sola relazione con `3D/3dmodel.model`.

Sono stati rimossi G-code, geometrie, thumbnail e immagini. I file di configurazione (`slice_info`, `project_settings`, `model_settings`) sono quelli prodotti dallo slicer, non riscritti a mano.

## Origine

- **Slicer:** Anycubic Slicer Next 2.0.0.3, build `20260904033713`, profilo 0.4 mm.
- **Modelli di partenza:** `gancio_bacinella.3mf` e `Hamster Wheel (Spinner).3mf`, forniti dal committente.
- I file slicati sono stati generati con la CLI dell'app installata:

  ```bash
  AnycubicSlicerNext --slice 0 --export-3mf <output>.gcode.3mf <input>.3mf
  ```

- **Export dalla GUI:** `Preview → Export plate sliced file...` (o `Export all plate sliced file...`). `Export G-code file...` produce un `.gcode` puro, non supportato dall’import; `Export Generic 3MF...` produce un 3MF non slicato e viene rifiutato.
- Il fixture non slicato è il progetto `gancio_bacinella.3mf` salvato con Anycubic Slicer Next 1.4.1.1: ha `slice_info.config` con il solo header, nessun `<plate>`.
- Uso interno. Prima di rendere pubblico il repository, verificare la licenza dei modelli di origine.

## File e valori attesi

| File                                | Stampante | Piatti | Valori attesi                                                         | Scopo                        |
| ----------------------------------- | --------- | ------ | --------------------------------------------------------------------- | ---------------------------- |
| `anycubic-kobra3-pla.gcode.3mf`     | Kobra 3   | 1      | piatto 1: 200 s, 1,46 g, PLA `#FF9016`, `used_g` 1,46                 | Caso base Kobra 3            |
| `anycubic-kobrax-pla.gcode.3mf`     | Kobra X   | 1      | piatto 1: 513 s, 3,76 g, PLA `#FF9016`, `used_g` 3,76                 | Caso base Kobra X            |
| `anycubic-kobrax-2plates.gcode.3mf` | Kobra X   | 2      | piatto 1: 6.069 s, 38,41 g; piatto 2: 2.650 s, 13,79 g; PLA `#FFFFFF` | Multi-piatto                 |
| `anycubic-unsliced-project.3mf`     | Kobra 3   | 0      | header `X-ACNext-Client-Version` 1.4.1.1; nessun `<plate>`            | Rifiuto progetto non slicato |

## Campi verificati

### `slice_info.config`

La struttura reale di Anycubic 2.0.0.3 usa `<metadata key="…" value="…">` annidati, non attributi sul `<plate>`:

```xml
<plate>
  <metadata key="index" value="1" />
  <metadata key="printer_model_id" value="Anycubic Kobra X" />
  <metadata key="prediction" value="513" />
  <metadata key="weight" value="3.76" />
  <filament id="1" type="PLA" color="#FF9016" used_m="1.26" used_g="3.76" />
</plate>
```

- `prediction` è in **secondi interi**.
- `weight` è il totale del piatto in **grammi**; `used_g` è il consumo del singolo filamento in grammi; `used_m` è in metri.
- `filament.id` è 1-based e si riferisce all'indice di `project_settings.filament_type` e `filament_colour`.
- `weight` coincide con la somma di `used_g` entro 0,01 g nei fixture. Il parser deve comunque avvisare se la differenza supera l'1% (piano fase 5, §2.4).
- `printer_model_id` **non è affidabile da solo**: è vuoto nel file Kobra 3 generato, è `Anycubic Kobra X` nel file Kobra X ed è un codice interno (`C12`) nei file Bambu. La fonte primaria per la stampante è `project_settings.config` → `printer_model`; `printer_model_id` serve solo come conferma o fallback.
- `filament_maps` può essere `"1"` o una lista separata da spazi (`"1 1 1 1"`); non serve al costo.
- La presenza di `slice_info.config` non basta: un progetto non slicato ha il file con il solo header. Il parser deve richiedere almeno un `<plate>` con `prediction` e almeno un `<filament>`.

### `project_settings.config`

Campi utili verificati:

- `printer_model` — `Anycubic Kobra 3` / `Anycubic Kobra X`;
- `printer_settings_id` — `Anycubic Kobra 3 0.4 nozzle` / `Anycubic Kobra X 0.4 nozzle`;
- `printer_variant` — `0.4`;
- `filament_type`, `filament_colour`, `filament_density`, `filament_diameter`.

### `model_settings.config`

- Ogni `<plate>` ha `plater_id` (1-based) e `plater_name`; nei fixture il nome è vuoto, quindi il fallback è nome file + “piatto N”.
- Ogni piatto elenca gli oggetti e il file G-code associato; il G-code non è incluso nei fixture ridotti.

### Identificazione dello slicer

- Anycubic: header `X-ACNext-Client-Version` (es. `2.0.0.3 20260904033713`).
- Bambu Studio: header `X-BBL-Client-Version`.
- `3D/3dmodel.model` → `Application` è `BambuStudio-2.0.0.3` anche nei file Anycubic, perché l'app deriva dal codice Bambu/Orca. **Non usare `Application` da solo** per identificare lo slicer: gli header sono più affidabili.

## Verifica Bambu non committata

Un file reale Bambu Studio `01.10.02.73` (Bambu Lab P1S, 8 piatti, PLA/PETG) è stato ispezionato localmente durante T5.3.1:

- header `X-BBL-Client-Version`;
- `project_settings.printer_model` = `Bambu Lab P1S`, `printer_model_id` = `C12`;
- 8 `<plate>`, ognuno con `prediction` e `used_g`; `weight` = somma di `used_g` entro 0,01 g;
- struttura dei campi identica a quella Anycubic, con header diverso.

Non è stato committato perché il modello di origine ha una licenza che non permette la ridistribuzione. In T5.3.2 va aggiunto un fixture Bambu equivalente con permesso esplicito o con un modello neutro.
