// Single source of truth for SQL keyword → emoji mapping.
// Every emoji is unique and chosen to represent the keyword's intent.

const SQL_KEYWORD_EMOJI_MAP = {
  // Data Query Language (DQL)
  'SELECT':       '🔍',   // magnifier        – select data
  'FROM':         '📂',   // folder           – source table
  'WHERE':        '🔎',   // magnifier        – filter condition
  'AND':          '🤝',   // handshake        – logical and
  'OR':           '🔀',   // shuffle          – logical or
  'NOT':          '🚷',   // no pedestrians   – logical not
  'IN':           '📥',   // inbox            – in set
  'BETWEEN':      '↔️',   // left-right arrow – between range
  'LIKE':         '🎭',   // masks            – pattern match
  'IS':           '🔗',   // link             – is comparison
  'NULL':         '🚫',   // prohibited       – null value
  'AS':           '🏷️',   // label            – alias
  'DISTINCT':     '✨',   // sparkles         – unique values
  'ALL':          '📦',   // package          – all records
  'ANY':          '🎲',   // dice             – any match
  'EXISTS':       '✅',   // check            – exists check

  // Ordering & Grouping
  'ORDER':        '📶',   // signal bars      – order results
  'BY':           '📌',   // pin              – by column
  'ASC':          '⬆️',   // up arrow         – ascending
  'DESC':         '⬇️',   // down arrow       – descending
  'GROUP':        '👥',   // group            – group rows
  'HAVING':       '🔬',   // microscope       – group filter
  'LIMIT':        '🛑',   // stop sign        – limit rows
  'OFFSET':       '⏭️',   // skip forward     – skip rows
  'TOP':          '🔝',   // top              – top n rows

  // Joins
  'JOIN':         '🔗',   // link             – join tables
  'INNER':        '🎯',   // target           – inner join
  'LEFT':         '⬅️',   // left arrow       – left join
  'RIGHT':        '➡️',   // right arrow      – right join
  'FULL':         '🔄',   // arrows           – full join
  'OUTER':        '🌐',   // globe            – outer join
  'CROSS':        '✖️',   // cross            – cross join
  'ON':           '🔛',   // on               – join condition
  'USING':        '🔧',   // wrench           – using columns

  // Data Manipulation Language (DML)
  'INSERT':       '➕',   // plus             – insert data
  'INTO':         '📥',   // inbox            – into table
  'VALUES':       '💎',   // gem              – values
  'UPDATE':       '✏️',   // pencil           – update data
  'SET':          '📝',   // memo             – set values
  'DELETE':       '🗑️',   // trash            – delete data
  'TRUNCATE':     '🧹',   // broom            – truncate table
  'MERGE':        '🔀',   // shuffle          – merge data

  // Data Definition Language (DDL)
  'CREATE':       '🏗️',   // construction     – create object
  'ALTER':        '🔧',   // wrench           – alter object
  'DROP':         '💥',   // collision        – drop object
  'TABLE':        '📊',   // bar chart        – table
  'DATABASE':     '🗄️',   // file cabinet     – database
  'SCHEMA':       '📐',   // ruler            – schema
  'INDEX':        '📑',   // tabs             – index
  'VIEW':         '👁️',   // eye              – view
  'SEQUENCE':     '🔢',   // numbers          – sequence
  'TRIGGER':      '⚡',   // lightning        – trigger
  'PROCEDURE':    '📜',   // scroll           – stored procedure
  'FUNCTION':     '⚙️',   // gear             – function

  // Constraints
  'PRIMARY':      '🔑',   // key              – primary key
  'FOREIGN':      '🔐',   // locked key       – foreign key
  'KEY':          '🗝️',   // old key          – key
  'UNIQUE':       '🦄',   // unicorn          – unique
  'CHECK':        '✔️',   // check            – check constraint
  'DEFAULT':      '📌',   // pin              – default value
  'CONSTRAINT':   '🔒',   // lock             – constraint
  'REFERENCES':   '🔗',   // link             – references
  'CASCADE':      '🌊',   // wave             – cascade action

  // Data Types
  'INT':          '🔢',   // numbers          – integer
  'INTEGER':      '🔢',   // numbers          – integer
  'BIGINT':       '📐',   // ruler            – big integer
  'SMALLINT':     '📏',   // ruler            – small integer
  'DECIMAL':      '💰',   // money bag        – decimal
  'NUMERIC':      '🔣',   // symbols          – numeric
  'FLOAT':        '🎈',   // balloon          – float
  'REAL':         '🎭',   // masks            – real
  'DOUBLE':       '🎭',   // masks            – double
  'VARCHAR':      '📝',   // memo             – variable char
  'CHAR':         '🔤',   // letters          – char
  'TEXT':         '📄',   // page             – text
  'DATE':         '📅',   // calendar         – date
  'TIME':         '🕐',   // clock            – time
  'TIMESTAMP':    '⏰',   // alarm clock      – timestamp
  'DATETIME':     '📆',   // calendar         – datetime
  'BOOLEAN':      '🔘',   // radio button     – boolean
  'BLOB':         '📦',   // package          – binary blob

  // Boolean Values
  'TRUE':         '✅',   // check mark       – true
  'FALSE':        '❌',   // cross mark       – false

  // Transaction Control
  'BEGIN':        '🚀',   // rocket           – begin
  'COMMIT':       '💾',   // floppy           – commit
  'ROLLBACK':     '↩️',   // return arrow     – rollback
  'SAVEPOINT':    '📍',   // pin              – savepoint
  'TRANSACTION':  '💳',   // credit card      – transaction

  // Access Control
  'GRANT':        '🎁',   // gift             – grant permission
  'REVOKE':       '🚫',   // prohibited       – revoke permission
  'DENY':         '⛔',   // no entry         – deny access

  // Subqueries & CTEs
  'WITH':         '📎',   // paperclip        – CTE
  'RECURSIVE':    '🔁',   // repeat           – recursive
  'UNION':        '🔗',   // link             – union
  'INTERSECT':    '🎯',   // target           – intersect
  'EXCEPT':       '➖',   // minus            – except

  // Aggregate Functions (as keywords)
  'COUNT':        '🔢',   // numbers          – count
  'SUM':          '➕',   // plus             – sum
  'AVG':          '📊',   // chart            – average
  'MIN':          '⬇️',   // down             – minimum
  'MAX':          '⬆️',   // up               – maximum

  // Window Functions
  'OVER':         '🪟',   // window           – window function
  'PARTITION':    '📂',   // folder           – partition by
  'ROWS':         '📋',   // clipboard        – rows
  'RANGE':        '↔️',   // left-right       – range

  // Case Expression
  'CASE':         '📋',   // clipboard        – case
  'WHEN':         '⏰',   // clock            – when
  'THEN':         '➡️',   // arrow            – then
  'ELSE':         '↪️',   // curved arrow     – else
  'END':          '🏁',   // checkered flag   – end

  // Null Handling
  'COALESCE':     '🔄',   // arrows           – coalesce
  'NULLIF':       '🚫',   // prohibited       – nullif
  'IFNULL':       '❓',   // question         – ifnull
  'NVL':          '🔃',   // arrows           – nvl (Oracle)

  // Misc
  'EXPLAIN':      '📖',   // book             – explain plan
  'ANALYZE':      '🔬',   // microscope       – analyze
  'EXECUTE':      '▶️',   // play             – execute
  'CALL':         '📞',   // phone            – call procedure
  'DECLARE':      '📢',   // megaphone        – declare variable
  'CURSOR':       '👆',   // point up         – cursor
  'FETCH':        '🎣',   // fishing          – fetch
  'OPEN':         '📂',   // folder open      – open cursor
  'CLOSE':        '📁',   // folder closed    – close cursor
  'IF':           '❓',   // question         – if
  'WHILE':        '🔂',   // repeat once      – while loop
  'RETURN':       '🔙',   // back arrow       – return
  'RETURNS':      '🔙',   // back arrow       – returns
};

module.exports = { SQL_KEYWORD_EMOJI_MAP };
