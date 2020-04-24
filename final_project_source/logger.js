export const LOG_LEVEL = 1
export const WARN_LEVEL = 2
export const ERR_LEVEL = 3

export class Logger {

    constructor(name) {

        console.log(`Logger "${name}" initialized`)
        this.name = name
    }
    
    _check_logger(level=this.default_level) {

        if(typeof(level) !== 'number') {
            console.log(`Invalid logger level type for logger: ${this.name}`)
            return false
        }

        if(level != LOG_LEVEL && level != WARN_LEVEL && level != ERR_LEVEL) {
            console.log(`Invalid logger level value for logger: ${this.name}`)
            return false
        }
        return true 
    }

    set_default_level(level) {

        if(this._check_logger(level)) 
            this.default_level = level  
    }

    log(message, level=this.default_level, force=false) {

        if(this._check_logger(level)) {

            const console_message = `${this.name}: ${level}: ${message}`
            if(level === WARN_LEVEL)
                console.warn(console_message)
            else if(level === ERR_LEVEL)
                console.error(console_message)
            else 
                console.log(console_message)       
        }
    }

    warn(message) {
        const console_message = `${this.name}: ${WARN_LEVEL}: ${message}`
        console.warn(console_message)
    }

    error(message) {
        const console_message = `${this.name}: ${WARN_LEVEL}: ${message}`
        console.warn(console_message)
    }
}