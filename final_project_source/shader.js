/*
STANDARD ATTRIBUTES
postion(vertices) 0, a_pos
normal            1, a_norm
uv(texture)       2, a_uv

STANDARD UNIFORMS
uPMatrix -> perspective matrix
uMVMatrix -> modelview matrix
uCameraMatrix -> camera matrix 
uClipPlane -> culling place. Vec4
*/

/* STANDARD TEXTURE TYPES */
const MODEL_TEXTURE = 0
const SKYBOX_TEXTURE = 1
const NORMAL_MAP = 2

/* Light Colors */
const AMBIENT_COLOR = [0.5, 0.5, 0.5, 1.0]
const DIFFUSE_COLOR = [0.6, 0.6, 0.7, 1.0]
const SPECULAR_COLOR = [1.0, 1.0, 1.0, 1.0]

import {Logger, LOG_LEVEL, WARN_LEVEL, ERR_LEVEL} from './logger.js'
let logger = new Logger("Shader")

/* Get attribute locations of attributes that should always be present */
function get_attrib_locations(gl, program) {
    return {
        pos: gl.getAttribLocation(program, "a_pos"),
        norm: gl.getAttribLocation(program, "a_norm"),
        uv: gl.getAttribLocation(program, "a_uv")
    }
}

/* Get uniform locations of uniforms that should always be present */
function get_uniform_locations(gl, program) {
    return {
        perspective_matrix: gl.getUniformLocation(program, "uPMatrix"),
        modelview_matrix: gl.getUniformLocation(program, "uMVMatrix"),
        camera_matrix: gl.getUniformLocation(program, "uCameraMatrix"),
        clip_plane: gl.getUniformLocation(program, "uClipPlane")
    }
}


function is_power_of_two(value) {
    return (value & (value - 1)) == 0
}

function load_shader(gl, type, source) {

    if(gl === null || gl === undefined) 
        logger.error("gl context is null")
    
    const shader = gl.createShader(type)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        logger.error("error compiling the shader of type: " + type + " " + gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null 
    }
    return shader 
}

function create_shader_program(gl, vert_shader_src, frag_shader_src) {
    const vertex_shader = load_shader(gl, gl.VERTEX_SHADER, vert_shader_src)
    if(vertex_shader === null) 
        return null 

    const fragment_shader = load_shader(gl, gl.FRAGMENT_SHADER, frag_shader_src)
    if(fragment_shader === null) 
        return null 
    
    let program = gl.createProgram()
    gl.attachShader(program, vertex_shader)
    gl.attachShader(program, fragment_shader)

    /* Bind predefined shader locations */
    gl.bindAttribLocation(program, 0, 'a_pos')
    gl.bindAttribLocation(program, 1, 'a_norm')
    gl.bindAttribLocation(program, 2, 'a_uv')

    gl.linkProgram(program)
    if(!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("error creating shader program ", gl.getProgramInfoLog(program))
        gl.deleteProgram(program) 
        return null 
    }

    gl.validateProgram(program)
    if(!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
        console.error("error validating shader program", gl.getProgramInfoLog(program))
        gl.deleteProgram(program)
        return null 
    }

    gl.deleteShader(fragment_shader)
    gl.deleteShader(vertex_shader)
    return program
}

export class Shader {
    constructor(gl, vert_shader, frag_shader) {
        this.gl = gl 
        this.program = create_shader_program(gl, vert_shader, frag_shader)
        if(this.program !== null) {
            this.attribute_location = get_attrib_locations(gl, this.program)
            this.uniform_location = get_uniform_locations(gl, this.program)
        }
        this.model_texture = null 
    }

    activate() { this.gl.useProgram(this.program) }
    deactivate() { this.gl.useProgram(null) }

    set_perspective_matrix(m) {this.gl.uniformMatrix4fv(this.uniform_location.perspective_matrix, false, new Float32Array(m)) }
    set_modelview_matrix(m) { this.gl.uniformMatrix4fv(this.uniform_location.modelview_matrix, false, new Float32Array(m)) }
    set_camera_matrix(m) {this.gl.uniformMatrix4fv(this.uniform_location.camera_matrix, false, new Float32Array(m)) 
        const u = this.gl.getUniformLocation(this.program, 'uCameraPos')
        this.gl.uniform3f(u, m[12], m[13], m[14])

        const u2 = this.gl.getUniformLocation(this.program, 'UViewMatrix')
        if(u2 != -1) {
            const vm = mat4.create()
            mat4.invert(vm, m)
            this.gl.uniformMatrix4fv(u2, false, new Float32Array(vm))
        }
    }
    set_clip_plane(x, y, z, w) { this.gl.uniform4f(this.uniform_location.clip_plane, x, y, z, w) }

    set_lightpos(v) {
        const luniform = this.gl.getUniformLocation(this.program, 'uLightPos');
        this.gl.uniform3f(luniform, v[0], v[1], v[2])
    }

    set_lightcolors(a, d, s) {
        const auniform = this.gl.getUniformLocation(this.program, 'uAmbientColor')
        const duniform = this.gl.getUniformLocation(this.program, 'uDiffuseColor')
        const suniform = this.gl.getUniformLocation(this.program, 'uSpecularColor')
        if(a === null)
            this.gl.uniform4f(auniform, ...AMBIENT_COLOR)
        if(d === null)
            this.gl.uniform4f(duniform, ...DIFFUSE_COLOR)
        if(s === null)
            this.gl.uniform4f(suniform, ...SPECULAR_COLOR)
    }

    add_texture(src, type) {
        console.log(type)
        if(type ===  MODEL_TEXTURE || type === NORMAL_MAP) {
          
            const texture = this.gl.createTexture()
            this.gl.bindTexture(this.gl.TEXTURE_2D, texture)

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
            image.src = src 

            console.log(type)
            if(type === MODEL_TEXTURE)
                this.model_texture = texture 
            else this.normal_map = texture
        }

        if(type === SKYBOX_TEXTURE) {
            const texture = this.gl.createTexture()
            this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, texture)

            const face_info = [
                {
                    target: this.gl.TEXTURE_CUBE_MAP_POSITIVE_X,
                    url: 'http://web.eecs.utk.edu/~dcraig14/2bN9gJ0sx3U/final_project_source/px.jpg'
                },
                {
                    target: this.gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
                    url: 'http://web.eecs.utk.edu/~dcraig14/2bN9gJ0sx3U/final_project_source/nx.jpg'
                },
                {
                    target: this.gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
                    url: 'http://web.eecs.utk.edu/~dcraig14/2bN9gJ0sx3U/final_project_source/py.jpg'
                },
                {
                    target: this.gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
                    url: 'http://web.eecs.utk.edu/~dcraig14/2bN9gJ0sx3U/final_project_source/ny.jpg'
                },
                {
                    target: this.gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
                    url: 'http://web.eecs.utk.edu/~dcraig14/2bN9gJ0sx3U/final_project_source/pz.jpg'
                },
                {
                    target: this.gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
                    url: 'http://web.eecs.utk.edu/~dcraig14/2bN9gJ0sx3U/final_project_source/nz.jpg'
                },
            ]
            let gl = this.gl
            face_info.forEach((fi) => {
                const {target, url} = fi 
                this.gl.texImage2D(target, 0, this.gl.RGBA, 512, 512, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null)

                const image = new Image()
                image.src = url 
                image.addEventListener('load', function() {
                    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture)
                    gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
                    gl.generateMipmap(gl.TEXTURE_CUBE_MAP)
                })
            })
            this.gl.generateMipmap(this.gl.TEXTURE_CUBE_MAP)
            this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR)
            this.skybox_texture = texture 
        }
    }

    render_model(model) {
        this.set_modelview_matrix(model.transform.view_matrix)
        this.gl.ext.bindVertexArrayOES(model.mesh.vao)
        if(this.model_texture !== null) {
            this.gl.activeTexture(this.gl.TEXTURE4)
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.model_texture)
            const tuniform = this.gl.getUniformLocation(this.program, 'uTexture')
            this.gl.uniform1i(tuniform, 4)
        }
        if(this.normal_map !== null && this.normal_map !== undefined) {
            // //this.gl.activeTexture(this.gl.TEXTURE3)
            // this.gl.bindTexture(this.gl.TEXTURE_2D, this.normal_map)
            // const nuniform = this.gl.getUniformLocation(this.program, 'uNormalMap')

            // if(nuniform != -1)
            //     this.gl.uniform1i(nuniform, 3)

            // this.gl.bindTexture(this.gl.TEXTURE_2D, null)
        }
        this.gl.drawElements(this.gl.TRIANGLES, model.mesh.index_count, this.gl.UNSIGNED_SHORT, 0)
    }

    render_skybox(model, camera) {
        this.set_modelview_matrix(camera.modelview_matrix)
        this.set_perspective_matrix(camera.perspective_matrix)

        const tuniform = this.gl.getUniformLocation(this.program, "uSkybox")
        this.gl.uniform1i(tuniform, 0)

        const uuniform = this.gl.getUniformLocation(this.program, 'uInverseMVMatrix')
        const m = mat4.create()
        mat4.invert(m, camera.modelview_matrix)
        this.gl.uniformMatrix4fv(uuniform, false, new Float32Array(m))
        
        const nuniform = this.gl.getUniformLocation(this.program, 'uInversePMatrix')
        const n = mat4.create()
        mat4.invert(n, camera.perspective_matrix)
        this.gl.uniformMatrix4fv(nuniform, false, new Float32Array(n)) 
        
        this.gl.ext.bindVertexArrayOES(model.mesh.vao)
        this.gl.drawArrays(this.gl.TRIANGLES, 0 ,1 * 6)
    }

    render_ocean(model, wave_factor) {

        this.set_modelview_matrix(model.transform.view_matrix)
        this.gl.ext.bindVertexArrayOES(model.mesh.vao)
        if(this.ocean_reflection_texture !== null && this.ocean_reflection_texture !== undefined) {
            const uniform = this.gl.getUniformLocation(this.program ,'uReflectionTexture')
            this.gl.uniform1i(uniform, 0)
            this.gl.activeTexture(this.gl.TEXTURE0)
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.ocean_reflection_texture)
        }
        // Refraction is not needed at this point
        // if(this.ocean_refraction_texture !== null && this.ocean_refraction_texture !== undefined) {
        //     const uniform = this.gl.getUniformLocation(this.program, 'uRefractionTexture')
        //     console.log(uniform)
        //     this.gl.uniform1i(uniform, 0)
        //     this.gl.activeTexture(this.gl.TEXTURE0)
        //     this.gl.bindTexture(this.gl.TEXTURE_2D, this.ocean_reflection_texture)
        // }
        if(this.ocean_dudv_texture !== null && this.ocean_dudv_texture !== undefined) {
            const duniform = this.gl.getUniformLocation(this.program, 'uDuDv')
            console.log(duniform)
            this.gl.uniform1i(duniform, 2)
            this.gl.activeTexture(this.gl.TEXTURE2)
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.ocean_dudv_texture)
        }
        const funiform = this.gl.getUniformLocation(this.program, 'uWaveFactor')
        this.gl.uniform1f(funiform, wave_factor)
        this.gl.drawElements(this.gl.TRIANGLES, model.mesh.index_count, this.gl.UNSIGNED_SHORT, 0)
    }
}