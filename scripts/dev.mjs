import {fileURLToPath} from 'node:url';
import {serve} from './server.mjs';

serve(fileURLToPath(new URL('../src/',import.meta.url)),5173);
