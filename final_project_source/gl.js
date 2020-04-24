export function gl_instance(canvas_id) {
    let canvas = document.getElementById(canvas_id)

    let gl = canvas.getContext("webgl")
    if(!gl) { console.error("WebGL context is not available "); return null }

    /* Init WebGl properties */
    gl.getExtension("OES_standard_derivatives")
    let ext = gl.getExtension("OES_vertex_array_object")
    console.log(ext)
    let x = gl.getExtension("WEBGL_depth_texture")
    console.log(x)
    gl.clearColor(1, 1, 1, 1)
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.CULL_FACE)
    gl.depthFunc(gl.LEQUAL)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    /* Augment the instance with some methods */

    /* Clear the depth and color buffers */
    gl.fclear = function() {
        gl.clearColor(0, 0, 0, 1)
        this.clear(this.COLOR_BUFFER_BIT | this.DEPTH_BUFFER_BIT)
        return this 
    }

    /* Set rendering context size */
    gl.fset_size = function(w, h) {
        this.canvas.style.width = w + 'px'
        this.canvas.style.height = h + 'px'
        this.canvas.width = w 
        this.canvas.height = h
        this.viewport(0, 0, w, h)
        return this 
    }
    gl.ext = ext 
    gl['mesh_cache'] = {}
    return gl 
}