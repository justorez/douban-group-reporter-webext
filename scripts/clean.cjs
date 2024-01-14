const path = require('path')
const fs = require('fs')

fs.rmSync(path.join(__dirname, '../dist'), {
    force: true,
    recursive: true
})
