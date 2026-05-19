// Single source of truth for SQL keyword → emoji mapping.
// Every emoji is unique and chosen to represent the keyword's intent.

const SQL_KEYWORD_EMOJI_MAP = {
  // Data Query Language (DQL)
  'SELECT':       '🔍',   // magnifier        – select data
  'FROM':         '📂',   // folder           – source table
  'WHERE':        '🔎',   // magnifier        – filter condition
  'AND':          '➕',   // plus             – logical and
  'OR':           '⚖️',   // scales           – logical or
  'NOT':          '➖',   // minus            – logical not
  'IN':           '🕵️',   // detective        – in set
  'BETWEEN':      '🌉',   // bridge           – between range
  'LIKE':         '🎭',   // masks            – pattern match
  'IS':           '🪪',   // id card          – is comparison
  'NULL':         '🚫',   // prohibited       – null value
  'AS':           '📛',   // name badge       – alias
  'DISTINCT':     '🎇',   // sparkler         – unique values
  'ALL':          '🥧',   // pie              – all records
  'ANY':          '🎲',   // dice             – any match
  'EXISTS':       '✅',   // check            – exists check

  // Ordering & Grouping
  'ORDER':        '📶',   // signal bars      – order results
  'BY':           '🗂️',   // card index dividers – by column
  'ASC':          '⬆️',   // up arrow         – ascending
  'DESC':         '⬇️',   // down arrow       – descending
  'GROUP':        '👥',   // group            – group rows
  'HAVING':       '🔭',   // telescope        – group filter
  'LIMIT':        '🚧',   // barrier          – limit rows
  'OFFSET':       '🦘',   // kangaroo         – skip rows
  'TOP':          '🔝',   // top              – top n rows

  // Joins
  'JOIN':         '🔩',   // bolt             – join tables
  'INNER':        '⭕',   // inner circle     – inner join
  'LEFT':         '⬅️',   // left arrow       – left join
  'RIGHT':        '➡️',   // right arrow      – right join
  'FULL':         '🙌',   // raised hands     – full join
  'OUTER':        '🌐',   // globe            – outer join
  'CROSS':        '✖️',   // cross            – cross join
  'ON':           '🔛',   // on               – join condition
  'USING':        '🪛',   // screwdriver      – using columns

  // Data Manipulation Language (DML)
  'INSERT':       '📩',   // envelope arrow   – insert data
  'INTO':         '📥',   // inbox            – into table
  'VALUES':       '💎',   // gem              – values
  'UPDATE':       '✏️',   // pencil           – update data
  'SET':          '🖊️',   // ballpoint pen    – set column values
  'DELETE':       '🗑️',   // trash            – delete data
  'TRUNCATE':     '🧹',   // broom            – truncate table
  'MERGE':        '🫂',   // embrace          – merge data

  // Data Definition Language (DDL)
  'CREATE':       '🏗️',   // construction     – create object
  'ALTER':        '🔨',   // hammer           – alter object
  'DROP':         '🪂',   // parachute        – drop object
  'TABLE':        '📊',   // bar chart        – table
  'DATABASE':     '🗄️',   // file cabinet     – database
  'SCHEMA':       '🔷',   // large blue diamond – schema structure blueprint
  'INDEX':        '📑',   // tabs             – index
  'VIEW':         '👁️',   // eye              – view
  'SEQUENCE':     '🎶',   // musical notes    – sequence
  'TRIGGER':      '⚡',   // lightning        – trigger
  'PROCEDURE':    '📜',   // scroll           – stored procedure
  'FUNCTION':     '⚙️',   // gear             – function

  // Constraints
  'PRIMARY':      '🔑',   // key              – primary key
  'FOREIGN':      '🛂',   // passport control – foreign key
  'KEY':          '🗝️',   // old key          – key
  'UNIQUE':       '🦄',   // unicorn          – unique
  'CHECK':        '✔️',   // check            – check constraint
  'DEFAULT':      '📌',   // pin              – default value
  'CONSTRAINT':   '🔒',   // lock             – constraint
  'REFERENCES':   '🧷',   // safety pin       – references
  'CASCADE':      '🏔️',   // mountain         – cascade action

  // Data Types
  'INT':          '🔢',   // numbers          – integer
  'INTEGER':      '🔢',   // numbers          – integer
  'BIGINT':       '🐘',   // elephant         – big integer
  'SMALLINT':     '📏',   // ruler            – small integer
  'DECIMAL':      '💰',   // money bag        – decimal
  'NUMERIC':      '🔣',   // symbols          – numeric
  'FLOAT':        '🎈',   // balloon          – float
  'REAL':         '🛟',   // lifebuoy         – real number type
  'DOUBLE':       '‼️',   // double exclaim   – double
  'VARCHAR':      '🪶',   // feather          – variable-length character string
  'CHAR':         '🔤',   // letters          – char
  'TEXT':         '📄',   // page             – text
  'DATE':         '📅',   // calendar         – date
  'TIME':         '🕰️',   // mantel clock     – time
  'TIMESTAMP':    '⌚',   // wristwatch       – timestamp
  'DATETIME':     '📆',   // calendar         – datetime
  'BOOLEAN':      '🔘',   // radio button     – boolean
  'BLOB':         '💩',   // pile of poo      – binary blob

  // Boolean Values
  'TRUE':         '👍',   // thumbs up        – true
  'FALSE':        '👎',   // thumbs down      – false

  // Transaction Control
  'BEGIN':        '🌅',   // sunrise          – begin
  'COMMIT':       '💾',   // floppy           – commit
  'ROLLBACK':     '⏪',   // rewind           – rollback
  'SAVEPOINT':    '📍',   // pin              – savepoint
  'TRANSACTION':  '💳',   // credit card      – transaction

  // Access Control
  'GRANT':        '🎁',   // gift             – grant permission
  'REVOKE':       '🚓',   // police car       – revoke permission
  'DENY':         '⛔',   // no entry         – deny access

  // Subqueries & CTEs
  'WITH':         '📎',   // paperclip        – CTE
  'RECURSIVE':    '♻️',   // recycle          – recursive
  'UNION':        '🪢',   // knot             – union
  'INTERSECT':    '🚥',   // traffic light    – intersect
  'EXCEPT':       '❎',   // cross mark box   – except

  // Aggregate Functions (as keywords)
  'COUNT':        '🫘',   // beans            – count
  'SUM':          '💯',   // hundred          – sum
  'AVG':          '📉',   // chart down       – average/statistical mean
  'MIN':          '🪫',   // low battery      – minimum
  'MAX':          '🔋',   // battery          – maximum

  // Window Functions
  'OVER':         '☁️',   // cloud            – window function
  'PARTITION':    '🍱',   // bento box        – partition by
  'ROWS':         '🫛',   // pea pod          – rows
  'RANGE':        '🌄',   // mountain range   – range

  // Case Expression
  'CASE':         '📋',   // clipboard        – case
  'WHEN':         '🕐',   // clock face       – when
  'THEN':         '💡',   // lightbulb        – result/consequence of case condition
  'ELSE':         '↪️',   // curved arrow     – else
  'END':          '⏹️',   // stop button      – end

  // Null Handling
  'COALESCE':     '🌊',   // wave             – coalesce
  'NULLIF':       '🤼',   // wrestlers        – nullif
  'IFNULL':       '🤼‍♀️',   // women wrestling  – ifnull
  'NVL':          '🔃',   // arrows           – nvl (Oracle)

  // Misc
  'EXPLAIN':      '📖',   // book             – explain plan
  'ANALYZE':      '🔬',   // microscope       – analyze
  'EXECUTE':      '▶️',   // play             – execute
  'CALL':         '📞',   // phone            – call procedure
  'DECLARE':      '📢',   // megaphone        – declare variable
  'CURSOR':       '👆',   // point up         – cursor
  'FETCH':        '🎣',   // fishing          – fetch
  'OPEN':         '📬',   // open mailbox     – open cursor
  'CLOSE':        '📁',   // folder closed    – close cursor
  'IF':           '❓',   // question         – if
  'WHILE':        '🔁',   // repeat arrows    – while loop
  'RETURN':       '🔙',   // back arrow       – return
  'RETURNS':      '🪃',   // boomerang        – returns
};

module.exports = { SQL_KEYWORD_EMOJI_MAP };
