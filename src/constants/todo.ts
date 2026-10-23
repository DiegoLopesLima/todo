import { ONE_SECOND_IN_MS } from '@/constants/time'
import type { Priority, RecurrenceFrequency } from '@/enums/todo'

/** Tamanho máximo do texto de um item. */
export const TODO_MAX_TEXT_LENGTH = 500

/** Níveis de aninhamento: a raiz é o nível 0, então `TODO_MAX_DEPTH` níveis cabem no total. */
export const TODO_MAX_DEPTH = 6

/** Teto duro de itens no documento; passar disso bloqueia a criação. */
export const TODO_MAX_ITEMS = 5000

/** Acima disto o app avisa que a lista está grande (lentidão e arquivo de backup pesado). */
export const TODO_WARN_ITEMS = 2000

/** Ocorrências geradas de uma só série ao "alcançar" os dias em que o app ficou fechado. */
export const TODO_MAX_CATCHUP_PER_SERIES = 31

/** Ocorrências geradas no total por execução da geração (todas as séries somadas). */
export const TODO_MAX_CATCHUP_PER_RUN = 200

/** Passos de desfazer guardados em memória. */
export const TODO_UNDO_LIMIT = 100

/** Eventos do histórico guardados; os mais antigos são podados. */
export const TODO_HISTORY_MAX_EVENTS = 2000

/** Idade máxima de um evento do histórico, em dias. */
export const TODO_HISTORY_MAX_AGE_DAYS = 180

/** Reordenações do mesmo item dentro desta janela viram um só evento no histórico. */
export const TODO_HISTORY_MERGE_WINDOW_MS = 2 * ONE_SECOND_IN_MS

/** Tamanho máximo do texto do item guardado num evento do histórico. */
export const TODO_HISTORY_TEXT_LENGTH = 120

/** Quantas mudanças de campo um único evento do histórico detalha. */
export const TODO_HISTORY_MAX_CHANGES = 8

/** Pausa antes de o item concluído "afundar" para o fim do grupo de irmãos. */
export const TODO_SINK_DELAY_MS = 600

/** Mudanças desde a última exportação a partir das quais o lembrete de backup aparece. */
export const TODO_BACKUP_REMINDER_CHANGES = 20

/** Dias sem exportar a partir dos quais o lembrete de backup aparece. */
export const TODO_BACKUP_REMINDER_DAYS = 14

/** "Limpar concluídas" remove o que foi concluído há mais que isto (em dias). */
export const TODO_CLEAR_COMPLETED_DAYS = 7

/** Tamanho máximo, em bytes, de um arquivo de importação. */
export const TODO_IMPORT_MAX_BYTES = 10 * 1024 * 1024

/** Acima de tantas linhas visíveis a animação de layout é desligada por desempenho. */
export const TODO_ANIMATION_ROW_LIMIT = 300

/** Recuo horizontal, em px, de cada nível da árvore (também usado para projetar o destino do drag). */
export const TODO_INDENT_PX = 20

/** Quantos pixels o ponteiro precisa andar antes de um arrasto começar (evita arrastar sem querer ao clicar). */
export const TODO_DRAG_ACTIVATION_DISTANCE = 6

/** Janela, em dias, que o contador de "dia zerado" mantém para o cálculo do streak. */
export const TODO_CLEARED_DAYS_RETENTION = 400

/** Ordem de exibição das prioridades: menor peso = mais urgente = primeiro. */
export const TODO_PRIORITY_WEIGHT: Record<Priority, number> = {
  p1: 0,
  p2: 1,
  p3: 2,
  p4: 3,
}

/** Prioridade dada a um item novo quando nada é informado. */
export const TODO_DEFAULT_PRIORITY: Priority = 'p4'

/** Maior intervalo permitido em cada frequência ("a cada N dias/semanas/meses/anos"). */
export const TODO_MAX_INTERVAL: Record<RecurrenceFrequency, number> = {
  daily: 365,
  weekly: 52,
  monthly: 24,
  yearly: 10,
}

/** Versão do formato do arquivo de exportação (cresce quando o formato muda). */
export const TODO_EXPORT_SCHEMA_VERSION = 1

/** Identifica um arquivo exportado por este app. */
export const TODO_EXPORT_APP_ID = 'todo'
