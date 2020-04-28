/* Constants */
const REFLECTION_WIDTH = 512
const REFLECTION_HEIGHT = 512


function is_power_of_two(value) {
    return (value & (value - 1)) == 0
}


/* Responsible for handling the ocean's FBOs */
export class OceanFrameBuffers {
    constructor(gl) {
        this.gl = gl 
        this.saved_width = this.gl.canvas.width 
        this.saved_height = this.gl.canvas.height 
        this.reflection_width = REFLECTION_WIDTH
        this.reflection_height = REFLECTION_HEIGHT

        this.initialize_reflection_framebuffer()
        this.ocean_dudv_texture = this.create_dudv(this.reflection_width, this.reflection_height)
    }

    bind_reflection_framebuffer() {
        this.bind_framebuffer(this.reflection_framebuffer, this.reflection_width, this.reflection_height)
    }

    initialize_reflection_framebuffer() {
        this.reflection_framebuffer = this.create_framebuffer()
        this.reflection_texture = this.create_texture_attachment(this.reflection_width, this.reflection_height)
        this.reflection_depth_texture = this.create_depth_buffer_attachment(this.reflection_width, this.reflection_height)
        this.unbind_current_framebuffer()
    }


    create_framebuffer() {
        const fb = this.gl.createFramebuffer()
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fb) 
        return fb 
    }

    bind_framebuffer(fb, w, h) {
        this.gl.bindTexture(this.gl.TEXTURE_2D, null)
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fb)
        this.gl.viewport(0, 0, w, h)
    }

    unbind_current_framebuffer() {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null) 
        this.gl.viewport(0, 0, this.saved_width, this.saved_height)
    }

    create_texture_attachment(w, h) {
        const texture = this.gl.createTexture()
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture)

        const level = 0
        const internal_format = this.gl.RGBA 
        const border =  0
        const format = this.gl.RGBA 
        const type = this.gl.UNSIGNED_BYTE
        const data = null 
        this.gl.texImage2D(this.gl.TEXTURE_2D, level, internal_format,
            w, h, border, format, type, data)
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR)
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR)

        /* Frame buffer should be bound already */
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, texture, level)
        return texture 
    }

    create_dudv(w, h) {
        const texture = this.gl.createTexture()
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture)
        const level = 0
        const internal_format = this.gl.RGBA 

        const image = new Image()
        image.onload = () => {
            this.gl.bindTexture(this.gl.TEXTURE_2D, texture)
                this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image)
                let gl = this.gl
                if(is_power_of_two(image.width) && is_power_of_two(image.height)) {
                    gl.generateMipmap(gl.TEXTURE_2D)
                } else {
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR) 

                }
        }
        image.src = 'http://web.eecs.utk.edu/~dcraig14/2bN9gJ0sx3U/final_project_source/waterdudv.jpg'
        return texture 
    }

    create_depth_texture_attachment(w, h) {
        const texture = this.gl.createTexture()
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture)
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.DEPTH_COMPONENT, w, h, 0,
            this.gl.DEPTH_COMPONENT, this.gl.UNSIGNED_SHORT, null)
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR)
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR)
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.TEXTURE_2D, texture, 0)
        return texture 
    }

    create_depth_buffer_attachment(w, h) {
        const depth_buffer = this.gl.createRenderbuffer()
        this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, depth_buffer)
        this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, w, h)
        this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, depth_buffer)
        return depth_buffer
    }
}