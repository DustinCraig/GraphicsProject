import {Logger, LOG_LEVEL, WARN_LEVEL, ERR_LEVEL} from './logger.js'
import {Camera} from './camera.js'
import {Model} from './model/model.js'
import {load_mesh, LoadFile} from './model/obj.js'
import {gl_instance} from './gl.js'
import { Shader } from './shader.js'
import {OceanFrameBuffers} from './ocean.js'
/* Logger for main program */
const logger = new Logger("Main")

/* WebGL context */
let gl = null 

/* Models */
let pier = null 
let skybox = null 
let ocean = null 
let boat = null 

/* Global camera */
let camera = null 


const pier_vertex_shader =`
attribute vec4 a_pos;
attribute vec3 a_norm;
attribute vec2 a_uv;

uniform mat4 uPMatrix;
uniform mat4 uMVMatrix;
uniform mat4 uCameraMatrix;
uniform vec3 uLightPos;
uniform vec4 uAmbientColor;
uniform vec4 uDiffuseColor;
uniform vec4 uSpecularColor;
uniform vec3 uCameraPos;
uniform vec4 uClipPlane;

varying highp vec2 vUV;
varying vec4 color;
varying vec3 vertPos;
varying float fogDepth;
varying float clip_distance; 

vec3 lnormal;

void main(void) {

    vec4 ambient_color = uAmbientColor;
    vec4 diffuse_color = uDiffuseColor;
    vec4 specular_color = uSpecularColor;
    float shine_val = 89.8; 
    clip_distance = dot(uMVMatrix * a_pos, uClipPlane);
    vUV = a_uv;
    vec4 p = uPMatrix * uCameraMatrix * uMVMatrix * a_pos;
    vertPos = ((uCameraMatrix * uMVMatrix) * a_pos).xyz;//p.xyz; //(uCameraMatrix * a_pos).xyz;
    fogDepth = distance(p, vec4(uCameraPos, 1.0)); 
    gl_Position = p;
    p = uMVMatrix * a_pos;

    lnormal = mat3(uMVMatrix) * a_norm;

    vec3 N = normalize(lnormal);
    vec3 L = normalize(uLightPos - vertPos);

    float lamb = max(dot(N, L), 0.0);
    float spec = 0.0;
    if(lamb > 0.0) {
        vertPos = vec3(p) / p.w;
        L = normalize(uLightPos - vertPos);
        N = a_norm;//normalize(vec3(uMVMatrix * vec4(a_norm, 0.0)));

        vec3 R = reflect(-L, N);
        vec3 V = normalize(-vec3(p));

        float spec_angle = max(dot(R, V), 0.0);
        spec = pow(spec_angle, shine_val);

    }
    color = vec4(vec3(ambient_color + lamb*diffuse_color + spec*specular_color), 1.0);
}
`

const pier_fragment_shader = `

precision mediump float;
uniform sampler2D uTexture;
varying highp vec2 vUV;
varying vec4 color; 
varying vec3 vertPos;
varying float fogDepth;
varying float clip_distance; 

void main(void) {
    float density = 0.01;
    float LOG2 = 1.442695;
    float z = gl_FragCoord.z / gl_FragCoord.w;
    float fogFactor = exp2(-density*density*z*z*LOG2);
    fogFactor = clamp(fogFactor, 0.0, 1.0);
    vec4 frag_color = texture2D(uTexture, vUV) * color;
    vec4 fog_color = vec4(0.8,0.9,1,1);
    gl_FragColor = mix(fog_color, frag_color, fogFactor);
}
`

const skybox_vertex_shader =`
attribute vec4 a_pos;
attribute vec3 a_norm;
attribute vec2 a_uv;

uniform mat4 uPMatrix;
uniform mat4 uInversePMatrix;
uniform mat4 uMVMatrix;
uniform mat4 uInverseMVMatrix;
uniform mat4 uCameraMatrix;
uniform vec4 uClipPlane;


varying vec3 eyeDirection;

void main() {
    mat4 inverseProjection = uInversePMatrix;
    mat3 inverseModelView = mat3(uInverseMVMatrix);
    vec3 unprojected = (inverseProjection * a_pos).xyz;
    eyeDirection = inverseModelView * unprojected;
    gl_Position = a_pos;
    gl_Position.z = 1.0;
}
`

const skybox_fragment_shader = `
precision mediump float;

varying vec3 eyeDirection;
uniform samplerCube uSkybox;

void main() {

    gl_FragColor = textureCube(uSkybox, eyeDirection);
}
`

const ocean_vertex_shader = `
attribute vec4 a_pos;
attribute vec3 a_norm;
attribute vec2 a_uv;

varying vec2 uv; 
varying vec4 clip_space; 
varying float clip_distance;

uniform mat4 uPMatrix;
uniform mat4 uMVMatrix;
uniform mat4 uCameraMatrix;
uniform mat4 uViewMatrix;
uniform vec4 uClipPlane;

void main(void) {
    float tiling = 36.0;
    uv = vec2(a_uv.x/2.0, a_uv.y/2.0 + 0.5) * tiling; 
    clip_distance = dot(uMVMatrix * a_pos, uClipPlane);
    clip_space = uPMatrix * uCameraMatrix * uMVMatrix * vec4(a_pos.x, 0.0, a_pos.y, 1.0);
    gl_Position =  clip_space;
}
`

const ocean_fragment_shader = `
precision mediump float;

varying vec2 uv;
varying vec4 clip_space;
varying float clip_distance;

uniform sampler2D uReflectionTexture;
uniform sampler2D uRefractionTexture; 
uniform sampler2D uDuDv;

uniform float uWaveFactor;

void main(void) {

    float wave_strength = 0.004;
    vec2 ndc = (clip_space.xy/clip_space.w)/2.0 + 0.5;
    vec2 refract_tex_coords = vec2(ndc.x, ndc.y);
    vec2 reflect_tex_coords = vec2(ndc.x, -ndc.y);
    vec2 distortion = (texture2D(uDuDv, vec2(uv.x + uWaveFactor, uv.y)).rg * 2.0 - 1.0) * wave_strength;
    distortion += (texture2D(uDuDv, vec2(-uv.x + uWaveFactor, uv.y + uWaveFactor)).rg * 2.0 - 1.0) * wave_strength;
    refract_tex_coords += distortion;
    refract_tex_coords = clamp(refract_tex_coords, 0.001, 0.999);
    reflect_tex_coords += distortion;
    reflect_tex_coords.x = clamp(reflect_tex_coords.x, 0.001, 0.999);
    reflect_tex_coords.y = clamp(reflect_tex_coords.y, -0.999, 0.001);
    vec4 reflection_color = texture2D(uReflectionTexture, reflect_tex_coords); 
    vec4 refraction_color = texture2D(uRefractionTexture, refract_tex_coords); 

    gl_FragColor = reflection_color;
    gl_FragColor = mix(gl_FragColor, vec4(0.0, 0.3, 0.5, 1.0), 0.4);
}
`

const boat_vertex_shader = `
attribute vec4 a_pos;
attribute vec3 a_norm;
attribute vec2 a_uv;

uniform mat4 uPMatrix;
uniform mat4 uMVMatrix;
uniform mat4 uCameraMatrix;
uniform vec4 uClipPlane;
uniform vec3 uCameraPos;
varying vec3 normInterp;
varying vec3 specNormal;
varying vec3 vertPos;
varying vec3 svertPos;
varying float fogDepth; 
varying vec2 vUV;
varying float clip_distance;

void main() {
    clip_distance = dot(uPMatrix * uCameraMatrix * uMVMatrix * a_pos, uClipPlane);
    vUV = a_uv;
    vec4 p = uPMatrix * uCameraMatrix * uMVMatrix * a_pos;
    gl_Position = p;
    fogDepth = distance(p, vec4(uCameraPos, 1.0)); 
    vertPos = vec3(p) / p.w;
    
    vec4 p2 = uCameraMatrix * uMVMatrix * a_pos;
    svertPos = vec3(p2) / p2.w;

    normInterp = vec3(uMVMatrix * vec4(a_norm, 0.0));
}
`

const boat_fragment_shader = `
precision mediump float;

varying vec3 normInterp;
varying vec3 vertPos;
varying vec3 svertPos;
varying float clip_distance;

uniform vec4 uAmbientColor;
uniform vec4 uDiffuseColor;
uniform vec4 uSpecularColor;
uniform vec3 uLightPos;
uniform sampler2D uTexture;
uniform sampler2D uNormalMap;
varying highp vec2 vUV;

float shine_val = 106.8;

void main() {
    vec3 N = normalize(normInterp);
    vec3 L = normalize(uLightPos - vertPos);

    float lamb = max(dot(N, L), 0.0);
    float spec = 0.0;

    if(lamb > 0.0) {
        L = normalize(uLightPos - svertPos);
        
        vec3 R = reflect(-L, N);
        vec3 V = normalize(-svertPos);

        float sangle = max(dot(R, V), 0.0);
        spec = pow(sangle, shine_val);
    }

    vec4 color = vec4(vec3(uAmbientColor + lamb*uDiffuseColor + spec*uSpecularColor), 1.0);

    float density = 0.01;
    float LOG2 = 1.442695;
    float z = gl_FragCoord.z / gl_FragCoord.w;
    float fogFactor = exp2(-density*density*z*z*LOG2);
    fogFactor = clamp(fogFactor, 0.0, 1.0);
    vec4 frag_color = texture2D(uTexture, vUV) * color;
    vec4 fog_color = vec4(0.8,0.9,1,1);
    gl_FragColor = mix(fog_color, frag_color, fogFactor);
}
`

let pier_shader = null 
let sky_shader = null 
let ocean_shader = null 
let ocean_fb = null 
let boat_shader = null 

async function main() {

    /* Initial setup */
    let canvas = document.getElementById('gl_canvas')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    canvas.requestPointerLock = canvas.requestPointerLock
    canvas.onclick = function() {
        canvas.requestPointerLock()
    }

    logger.set_default_level(LOG_LEVEL)
    logger.log('Initializing...')
    /*****************/

    gl = gl_instance('gl_canvas')
    gl.fclear()

    pier_shader = new Shader(gl, pier_vertex_shader, pier_fragment_shader)
    pier_shader.add_texture('http://web.eecs.utk.edu/~dcraig14/2bN9gJ0sx3U/final_project_source/model/Wood_01.jpg', 0)

    sky_shader = new Shader(gl, skybox_vertex_shader, skybox_fragment_shader)
    sky_shader.add_texture(null, 1)

    ocean_shader = new Shader(gl, ocean_vertex_shader, ocean_fragment_shader)

    camera = new Camera(gl, null, null, null, canvas)
    camera.transform.position = [0, 28, -4]
    camera.update_viewmatrix()
    
    let pier_file = await LoadFile('http://web.eecs.utk.edu/~dcraig14/2bN9gJ0sx3U/final_project_source/model/WoodenBridge_01.obj')
    pier = new Model(gl, 'pier', load_mesh(pier_file))

    let boat_file = await LoadFile('http://web.eecs.utk.edu/~dcraig14/2bN9gJ0sx3U/final_project_source/model/OldBoat.obj')
    boat_shader = new Shader(gl, boat_vertex_shader, boat_fragment_shader)
    boat_shader.add_texture('http://web.eecs.utk.edu/~dcraig14/2bN9gJ0sx3U/final_project_source/model/boattex.jpg', 0)
    boat_shader.add_texture('http://web.eecs.utk.edu/~dcraig14/2bN9gJ0sx3U/final_project_source/model/boattexnm.jpg', 2)
    boat = new Model(gl, 'boat', load_mesh(boat_file))

    skybox = new Model(gl, 'skybox')

    let quad_file = await LoadFile('http://web.eecs.utk.edu/~dcraig14/2bN9gJ0sx3U/final_project_source/model/quad.obj')
    ocean = new Model(gl, 'ocean2', load_mesh(quad_file))
    ocean_fb = new OceanFrameBuffers(gl)

    let old_dt = 0 
    function render(now) {
        now *= 0.001
        const dt = now - old_dt
        old_dt = dt 
        display(gl)
        requestAnimationFrame(render)
    }
    requestAnimationFrame(render)
    
}

function render_scene(gl, cp) {
    gl.fclear()

    /* Render the pier */
    pier_shader.activate()
    pier_shader.set_perspective_matrix(camera.perspective_matrix)
    pier_shader.set_camera_matrix(camera.modelview_matrix)
    pier_shader.set_clip_plane(...cp)
    pier_shader.set_lightpos([0, 10, 0])
    pier.transform.position = [0, 2, 0]
    pier.transform.scale = [.3, .3, .3]
    pier.pre_render()
    pier_shader.set_clip_plane(...cp)
    pier_shader.set_lightcolors(null, null, null)
    pier_shader.render_model(pier)

    /* Render boat */
    boat_shader.activate()
    boat_shader.set_perspective_matrix(camera.perspective_matrix)
    boat_shader.set_camera_matrix(camera.modelview_matrix)
    boat_shader.set_lightpos([10, 17, 0])
    boat.transform.position = [10, 13, 50]
    boat.transform.rotation = [0, 90, 0]
    boat.transform.scale = [1, 1, 1]
    boat.pre_render()
    boat_shader.set_clip_plane(...cp)
    boat_shader.set_lightcolors(null, null, null)
    boat_shader.render_model(boat)

    /* Set up skybox */
    sky_shader.activate()
    sky_shader.set_perspective_matrix(camera.perspective_matrix)
    sky_shader.set_camera_matrix(camera.modelview_matrix)
    sky_shader.set_clip_plane(...cp)
    sky_shader.render_skybox(skybox, camera)

    
}

let cp = [0,13,0,0]
let WAVE_FACTOR = 0
let WAVE_SPEED = 0.0003

function display(gl) {
    
    camera.update_viewmatrix()
    WAVE_FACTOR += WAVE_SPEED
    WAVE_FACTOR %= 1

    /* Reflection pass */
    ocean_fb.bind_reflection_framebuffer()
    const distance = 2 * (camera.transform.position[1] - 13)
    camera.pitch = -camera.pitch 
    camera.transform.position[1] -= distance 
    camera.update_viewmatrix()
    render_scene(gl, cp) 
    ocean_fb.unbind_current_framebuffer()

    /* Fix camera */
    camera.transform.position[1] += distance 
    camera.pitch = -camera.pitch 
    camera.update_viewmatrix()

    /* Refraction pass */
    // ocean_fb.bind_refraction_framebuffer()
    // render_scene(gl, cp)
    // ocean_fb.unbind_current_framebuffer()

    /* Render whole scene */
    render_scene(gl, cp) 

    /* Render ocean */
    ocean_shader.activate()
    ocean_shader.set_perspective_matrix(camera.perspective_matrix)
    ocean_shader.set_camera_matrix(camera.modelview_matrix)
    ocean_shader.set_clip_plane(...cp)
    ocean.transform.position = [0, 13, 0]
    ocean.transform.rotation = [0, 0, 0]
    ocean.transform.scale = [190, 1, 190]
    ocean.pre_render()
    ocean_shader.ocean_reflection_texture = ocean_fb.reflection_texture 
    ocean_shader.ocean_refraction_texture = ocean_fb.refraction_texture
    ocean_shader.ocean_dudv_texture = ocean_fb.ocean_dudv_texture
    ocean_shader.render_ocean(ocean, WAVE_FACTOR)

}

window.onload = main
window.onresize = () => {
    (gl!==null)?gl.fset_size(window.innerWidth, window.innerHeight):{}
}