
process.stdin.resume()
process.stdin.setEncoding('utf8')
var text = ''
process.stdin.on('data', function (data) {
    text += data || ''
})
process.stdin.on('close', function () {
    process.stdout.write(JSON.stringify(JSON.parse(text), null, '    '))
})

