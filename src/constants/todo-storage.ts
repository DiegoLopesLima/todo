/** Nome do banco IndexedDB do app. */
export const TODO_IDB_NAME = 'todo-app'

/** Nome do object store onde ficam as chaves abaixo. */
export const TODO_IDB_STORE = 'keyval'

/** Chave do documento (itens, séries, histórico). */
export const TODO_IDB_DOC_KEY = 'todo:document'

/** Chave das preferências de interface (recolhidos, confete etc.). */
export const TODO_IDB_PREFS_KEY = 'todo:prefs'

/** Prefixo da cópia crua guardada quando o documento salvo não passa na validação. */
export const TODO_IDB_CORRUPT_PREFIX = 'todo:corrupt:'

/** Espera sem novas mudanças antes de gravar no IndexedDB. */
export const TODO_WRITE_DEBOUNCE_MS = 400

/** Teto de espera: mesmo com mudanças contínuas, grava a cada tanto. */
export const TODO_WRITE_MAX_WAIT_MS = 2000

/** Nome do canal que avisa as outras abas de que o documento mudou. */
export const TODO_SYNC_CHANNEL = 'todo-sync'

/** Versão do esquema persistido; sobe junto com um novo passo em `migrate`. */
export const TODO_PERSIST_VERSION = 1
