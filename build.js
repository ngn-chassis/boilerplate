const path = require('path')
const fs = require('fs-extra')

const ProductionLine = require('productionline-web')
const TaskRunner = require('shortbus')

const Chassis = require('@chassis/core')
const CleanCss = require('clean-css')

class CustomProductionLine extends ProductionLine {
  constructor (cfg) {
    super(cfg)
  }

  buildCSS (minify = true, cb) {
    let tasks = new TaskRunner()

    let cfg = {
      minify,
      sourceMap: minify,
      importBasePath: path.resolve(`${this.SOURCE}/css`),
      theme: path.resolve(`${this.SOURCE}/css/main.theme`)
    }

    let chassis = new Chassis()

    this.walk(this.paths.css).forEach(filepath => {
      tasks.add(`Process ${this.localDirectory(filepath)}`, next => {
        let input = this.readFileSync(filepath)

        let output = {
          filename: this.outputDirectory(filepath),
          css: null,
          sourceMap: null
        }

        if (cfg.sourceMap) {
          cfg.sourceMapPath = path.dirname(output.filename)
        }

        chassis.cfg = cfg

        chassis.process(input, (err, processed) => {
          if (err) {
            throw err
          }

          if (processed.sourceMap) {
            this.writeFileSync(`${output.filename}.map`, processed.sourceMap)
          }

          this.writeFile(output.filename, processed.css, next)
        }, filepath)
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
    this.addTask('Build CSS', next => this.buildCSS(dev, next))
  }
}

const builder = new CustomProductionLine({
  header: `Copyright (c) ${new Date().getFullYear()} Ecor Ventures LLC.\nVersion ${this.version} built on ${new Date().toString()}`,

  commands: {
    '--build' (cmd) {
      builder.make()
    },

    '--build-dev' (cmd) {
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
