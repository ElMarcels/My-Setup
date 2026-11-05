import { rmSync } from 'node:fs'
import { DATA_DIR } from './config'

rmSync(DATA_DIR, { recursive: true, force: true })
console.log(`Base de datos y subidas eliminadas: ${DATA_DIR}`)
console.log('Se recrearán automáticamente al iniciar el servidor.')
