const path = require('path')
const fs = require('fs-extra')

const ProductionLine = require('productionline-web')
const TaskRunner = require('shortbus')
const Chassis = require('@chassis/core')

class CustomProductionLine extends ProductionLine {
  constructor (cfg) {
    super(cfg)
  }

  buildCSS (minify = true, cb) {
    let tasks = new TaskRunner()

    this.walk(this.paths.css).forEach(filepath => {
      tasks.add(`Process ${this.localDirectory(filepath)}`, next => {
        let chassis = new Chassis({
          minify,
          sourceMap: minify,
          sourceMapPath: path.dirname(this.outputDirectory(filepath)),
          importBasePath: path.resolve(`${this.SOURCE}/css`),
          theme: path.resolve(`${this.SOURCE}/css/main.theme`)
        })

        chassis.process(filepath, (err, processed) => {
          if (err) {
            throw err
          }

          if (processed.sourceMap) {
            this.writeFileSync(`${this.outputDirectory(filepath)}.map`, processed.sourceMap)
          }

          this.writeFile(this.outputDirectory(filepath), processed.css, next)
        })
      })
    })

    tasks.on('complete', cb)
    tasks.run()
  }

  make (dev = false) {
    this.clean()
    this.copyAssets()
    this.buildHTML()
    this.buildJavaScript()
    this.addTask('Build CSS', next => this.buildCSS(!dev, next))
  }
}

const builder = new CustomProductionLine({
  header: `Copyright (c) ${new Date().getFullYear()} Ecor Ventures LLC.\nVersion ${this.version} built on ${new Date().toString()}`,

  commands: {
    '--prod' (cmd) {
      builder.make()
    },

    '--dev' (cmd) {
      builder.make(true)

      builder.watch((action, filepath) => {
        if (action === 'create' || action === 'update') {
          builder.make(true)
          builder.run()
        }
      })
    }
  }
})

builder.assets = path.resolve('./src/assets')
builder.paths = {
  css: path.join(builder.SOURCE, '/**/*.css')
}

builder.run()
