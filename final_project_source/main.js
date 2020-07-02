import { Logger, LOG_LEVEL, WARN_LEVEL, ERR_LEVEL } from './logger.js'
import { Camera } from './camera.js'
import { Model } from './model/model.js'
import { load_mesh, LoadFile } from './model/obj.js'
import { gl_instance } from './gl.js'
import { Shader } from './shader.js'
import { OceanFrameBuffers } from './ocean.js'

/* Logger for main program */
const logger = new Logger('Main')

/* WebGL context */
let gl = null

/* Models */
let pier = null
let skybox = null
let ocean = null
let boat = null
let grass = null
let dirt = null
let cabin = null
let candle = null
let table = null

/* Global camera */
let camera = null

const skybox_vertex_shader = `
attribute vec4 a_pos;
attribute vec3 a_norm;
attribute vec2 a_uv;

uniform mat4 uPMatrix;
uniform mat4 uInversePMatrix;
uniform mat4 uMVMatrix;
uniform mat4 uInverseMVMatrix;
uniform mat4 uCameraMatrix;

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
uniform vec4 uAmbientColor;

void main() {
    gl_FragColor = textureCube(uSkybox, eyeDirection) * uAmbientColor;
}
`

const ocean_vertex_shader = `
attribute vec4 a_pos;
attribute vec3 a_norm;
attribute vec2 a_uv;

varying vec2 uv; 
varying vec4 clip_space; 
varying vec3 vnorm;
varying vec3 vpos;
varying float clip_distance;

uniform mat4 uPMatrix;
uniform mat4 uMVMatrix;
uniform mat4 uCameraMatrix;
uniform mat4 uViewMatrix;
uniform mat3 uMVITMatrix;
uniform vec4 uClipPlane;

void main(void) {
    vnorm = uMVITMatrix * a_norm; 
    float tiling = 36.0;
    uv = vec2(a_uv.x/2.0, a_uv.y/2.0 + 0.5) * tiling; 
    clip_space = uPMatrix * uCameraMatrix * uMVMatrix * vec4(a_pos.x, 0.0, a_pos.y, 1.0);
    gl_Position =  clip_space;
    vpos = (uMVMatrix * vec4(a_pos.x, 0.0, a_pos.y, 1.0)).xyz;
}
`

const ocean_fragment_shader = `
precision mediump float;

varying vec2 uv;
varying vec4 clip_space;
varying vec3 vnorm;
varying vec3 vpos;

uniform sampler2D uReflectionTexture;
uniform vec4 uAmbientColor;
uniform vec3 uLightPos;
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

    gl_FragColor = reflection_color;
    gl_FragColor = mix(gl_FragColor, vec4(0.0, 0.3, 0.5, 1.0), 0.4);


    vec3 normal = normalize(vnorm);
    vec3 surfaceToLight = uLightPos - vpos;

    float density = 0.02;
    float LOG2 = 1.442695;
    float z = gl_FragCoord.z / gl_FragCoord.w;
    float fogFactor = exp2(-density*density*z*z*LOG2);
    fogFactor = clamp(fogFactor, 0.0, 1.0);
    vec4 fog_color = vec4(0.8,0.9,1,1);
    
    gl_FragColor = mix(fog_color, gl_FragColor, fogFactor) * uAmbientColor;
}
`

const grass_vertex_shader = `
attribute vec4 a_pos;
attribute vec3 a_norm;
attribute vec2 a_uv;

uniform mat4 uPMatrix;
uniform mat4 uMVMatrix;
uniform mat4 uCameraMatrix;
uniform vec3 uCameraPos;
uniform vec4 uClipPlane;

varying vec2 vUV;

void main() {
    vUV = a_uv;
    vec4 p = uPMatrix * uCameraMatrix * uMVMatrix * a_pos;
    gl_Position = p;

}
`

const grass_fragment_shader = `
precision mediump float;

varying vec2 vUV; 
uniform sampler2D uTexture;
uniform vec3 uLightPos;
uniform vec4 uAmbientColor;
uniform vec4 uDiffuseColor;
uniform vec4 uSpecularColor;

void main() {
    float density = 0.02;
    float LOG2 = 1.442695;
    float z = gl_FragCoord.z / gl_FragCoord.w;
    float fogFactor = exp2(-density*density*z*z*LOG2);
    fogFactor = clamp(fogFactor, 0.0, 1.0);
    vec4 fog_color = vec4(0.8,0.9,1,1);
    vec4 frag_color = texture2D(uTexture, vUV);
    
    gl_FragColor = mix(fog_color, frag_color, fogFactor) * uAmbientColor;
}
`

const dirt_vertex_shader = `
attribute vec4 a_pos;
attribute vec3 a_norm;
attribute vec2 a_uv;

uniform mat4 uPMatrix;
uniform mat4 uMVMatrix;
uniform mat4 uCameraMatrix;
uniform vec3 uCameraPos;
uniform vec4 uClipPlane;

varying vec2 vUV;

void main() {
    vUV = a_uv;
    gl_Position = uPMatrix * uCameraMatrix * uMVMatrix * a_pos;
}
`

const dirt_fragment_shader = `
precision mediump float;

varying vec2 vUV; 
uniform sampler2D uTexture;
uniform vec3 uLightPos;
uniform vec4 uAmbientColor;
uniform vec4 uDiffuseColor;
uniform vec4 uSpecularColor;

void main() {
    float density = 0.02;
    float LOG2 = 1.442695;
    float z = gl_FragCoord.z / gl_FragCoord.w;
    float fogFactor = exp2(-density*density*z*z*LOG2);
    fogFactor = clamp(fogFactor, 0.0, 1.0);
    vec4 fog_color = vec4(0.8,0.9,1,1);
    vec4 frag_color = texture2D(uTexture, vUV);
    gl_FragColor = mix(fog_color, frag_color, fogFactor) * uAmbientColor;
}
`

const object_vertex_shader = `
attribute vec4 a_pos;
attribute vec3 a_norm;
attribute vec2 a_uv;

uniform mat4 uPMatrix;
uniform mat4 uMVMatrix;
uniform mat3 uMVITMatrix;
uniform mat4 uCameraMatrix;
uniform vec3 uCameraPos;
uniform vec4 uClipPlane;
uniform float uLightIntensity;


varying vec2 vUV;
varying vec3 vpos;
varying vec3 vnorm; 
varying float intensity;
varying vec3 vSurfaceToLight;

void main() {
    intensity = uLightIntensity;
    vnorm = normalize(uMVITMatrix * a_norm); 
    vUV = a_uv;
    vec4 p = uPMatrix * uCameraMatrix * uMVMatrix * a_pos;
    gl_Position = p;
    vpos = (uMVMatrix * a_pos).xyz;
}
`

const object_fragment_shader = `
precision mediump float;

varying vec2 vUV; 
varying vec3 vpos;
varying vec3 vnorm; 
varying float intensity;
varying vec3 vSurfaceToLight;
uniform sampler2D uTexture;
uniform sampler2D uNormalMap;

uniform vec4 uAmbientColor;
uniform vec4 uDiffuseColor;
uniform vec4 uSpecularColor;
uniform vec3 uLightPos;

void main() {
    vec3 normal = normalize(vnorm);
    vec3 surfaceToLight = uLightPos - vpos;

    float d = length(surfaceToLight);
    float attenuation = clamp(10.0 / d, 0.0, 1.0);
    float light = dot(normal, surfaceToLight) / (length(surfaceToLight) * length(normal));
    light = clamp(light, 0.0, 1.0);

    float density = 0.01;
    float LOG2 = 1.442695;
    float z = gl_FragCoord.z / gl_FragCoord.w;
    float fogFactor = exp2(-density*density*z*z*LOG2);
    fogFactor = clamp(fogFactor, 0.0, 1.0);
    vec4 fog_color = vec4(0.8,0.9,1,1)*uAmbientColor;
    vec4 frag_color = texture2D(uTexture, vUV);
    gl_FragColor =  vec4(vec3(uAmbientColor*texture2D(uTexture, vUV) + texture2D(uTexture, vUV)*light*uDiffuseColor*attenuation*intensity), 1.0);
    gl_FragColor = mix(fog_color, gl_FragColor, fogFactor);    
}
`

const object_vertex_shader_nm = `
attribute vec4 a_pos;
attribute vec3 a_norm;
attribute vec2 a_uv;

uniform mat4 uPMatrix;
uniform mat4 uMVMatrix;
uniform mat3 uMVITMatrix;
uniform mat4 uCameraMatrix;
uniform vec3 uCameraPos;
uniform vec4 uClipPlane;
uniform float uLightIntensity;


varying vec2 vUV;
varying vec3 vpos;
varying vec3 vnorm; 
varying float intensity;
varying vec3 vSurfaceToLight;

void main() {
    intensity = uLightIntensity;
    vnorm = normalize(uMVITMatrix * a_norm); 
    vUV = a_uv;
    vec4 p = uPMatrix * uCameraMatrix * uMVMatrix * a_pos;
    gl_Position = p;
    vpos = (uMVMatrix * a_pos).xyz;
}
`

const object_fragment_shader_nm = `
precision mediump float;

varying vec2 vUV; 
varying vec3 vpos;
varying vec3 vnorm; 
varying float intensity;
varying vec3 vSurfaceToLight;
uniform sampler2D uTexture;
uniform sampler2D uNormalMap;

uniform vec4 uAmbientColor;
uniform vec4 uDiffuseColor;
uniform vec4 uSpecularColor;
uniform vec3 uLightPos;

void main() {
    vec3 normal = texture2D(uNormalMap, vUV).rbg;
    normal = normalize(normal * 2.0 - 1.0);
    vec3 surfaceToLight = uLightPos - vpos;

    float d = length(surfaceToLight);
    float attenuation = clamp(10.0 / d, 0.0, 1.0);
    float light = dot(normal, surfaceToLight) / (length(surfaceToLight) * length(normal));
    light = clamp(light, 0.0, 1.0);

    float density = 0.01;
    float LOG2 = 1.442695;
    float z = gl_FragCoord.z / gl_FragCoord.w;
    float fogFactor = exp2(-density*density*z*z*LOG2);
    fogFactor = clamp(fogFactor, 0.0, 1.0);
    vec4 fog_color = vec4(0.8,0.9,1,1)*uAmbientColor;
    vec4 frag_color = texture2D(uTexture, vUV);
    gl_FragColor =  vec4(vec3(uAmbientColor*texture2D(uTexture, vUV) + texture2D(uTexture, vUV)*light*uDiffuseColor*attenuation*intensity), 1.0);
    gl_FragColor = mix(fog_color, gl_FragColor, fogFactor);    
}
`

/* Shader declarations */
let pier_shader = null
let sky_shader = null
let ocean_shader = null
let ocean_fb = null
let boat_shader = null
let grass_shader = null
let dirt_shader = null
let cabin_shader = null
let candle_shader = null
let table_shader = null

/* Light intensities */
let cabin_intensity = 0
let boat_intensity = 0

async function main() {
  /* Initial setup */
  let canvas = document.getElementById('gl_canvas')
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight

  canvas.requestPointerLock = canvas.requestPointerLock
  canvas.onclick = function () {
    canvas.requestPointerLock()
  }

  logger.set_default_level(LOG_LEVEL)
  logger.log('Initializing...')
  /*****************/

  gl = gl_instance('gl_canvas')
  gl.fclear()

  /* Pier */
  let pier_file = await LoadFile(
    'https://dustincraig.github.io/GraphicsProject/final_project_source/model/pier/model.obj'
  )
  pier = new Model(gl, 'pier', load_mesh(pier_file))
  pier_shader = new Shader(gl, object_vertex_shader, object_fragment_shader)
  pier_shader.add_texture(
    'https://dustincraig.github.io/GraphicsProject/final_project_source/model/pier/texture.jpg',
    0
  )

  /* Skybox */
  skybox = new Model(gl, 'skybox')
  sky_shader = new Shader(gl, skybox_vertex_shader, skybox_fragment_shader)
  sky_shader.add_texture(null, 1)

  /* Boat */
  let boat_file = await LoadFile(
    'https://dustincraig.github.io/GraphicsProject/final_project_source/model/boat/model.obj'
  )
  boat = new Model(gl, 'boat', load_mesh(boat_file))
  boat_shader = new Shader(gl, object_vertex_shader_nm, object_fragment_shader_nm)
  boat_shader.add_texture(
    'https://dustincraig.github.io/GraphicsProject/final_project_source/model/boat/texture.jpg',
    0
  )
  boat_shader.add_texture(
    'https://dustincraig.github.io/GraphicsProject/final_project_source/model/boat/normal_map.jpg',
    2
  )

  /* Cabin */
  let cabin_file = await LoadFile(
    'https://dustincraig.github.io/GraphicsProject/final_project_source/model/cabin/model.obj'
  )
  cabin = new Model(gl, 'cabin', load_mesh(cabin_file))
  cabin_shader = new Shader(gl, object_vertex_shader_nm, object_fragment_shader_nm)
  cabin_shader.add_texture(
    'https://dustincraig.github.io/GraphicsProject/final_project_source/model/cabin/texture.jpg',
    0
  )
  cabin_shader.add_texture(
    'https://dustincraig.github.io/GraphicsProject/final_project_source/model/cabin/normal_map.jpg',
    2
  )

  /* Dirt */
  let cube_file = await LoadFile(
    'https://dustincraig.github.io/GraphicsProject/final_project_source/model/cube.obj'
  )
  dirt = new Model(gl, 'dirt', load_mesh(cube_file))
  dirt_shader = new Shader(gl, dirt_vertex_shader, dirt_fragment_shader)
  dirt_shader.add_texture(
    'https://dustincraig.github.io/GraphicsProject/final_project_source/model/dirt.jpg',
    0,
    1
  )

  let quad_file = await LoadFile(
    'https://dustincraig.github.io/GraphicsProject/final_project_source/model/quad.obj'
  )
  /* Grass */
  grass = new Model(gl, 'grass', load_mesh(quad_file))
  grass_shader = new Shader(gl, grass_vertex_shader, grass_fragment_shader)
  grass_shader.add_texture(
    'https://dustincraig.github.io/GraphicsProject/final_project_source/model/grass.jpg',
    0
  )

  /* Candle */
  let candle_file = await LoadFile(
    'https://dustincraig.github.io/GraphicsProject/final_project_source/model/candle/model.obj'
  )
  candle = new Model(gl, 'candle', load_mesh(candle_file))
  candle_shader = new Shader(gl, object_vertex_shader, object_fragment_shader)
  candle_shader.add_texture(
    'https://dustincraig.github.io/GraphicsProject/final_project_source/model/candle/texture.jpg',
    0
  )

  /* Table */
  let table_file = await LoadFile(
    'https://dustincraig.github.io/GraphicsProject/final_project_source/model/desk/model.obj'
  )
  table = new Model(gl, 'table', load_mesh(table_file))
  table_shader = new Shader(gl, object_vertex_shader, object_fragment_shader)
  table_shader.add_texture(
    'https://dustincraig.github.io/GraphicsProject/final_project_source/model/desk/texture.png',
    0
  )

  /* Ocean */
  ocean = new Model(gl, 'ocean2', load_mesh(quad_file))
  ocean_fb = new OceanFrameBuffers(gl)
  ocean_shader = new Shader(gl, ocean_vertex_shader, ocean_fragment_shader)

  camera = new Camera(gl, null, null, null, canvas)
  camera.transform.position = [0, 33, -4]
  camera.update_viewmatrix()

  let old_dt = 0
  function render(now) {
    now *= 0.001
    const dt = now - old_dt
    old_dt = dt
    display(gl, dt)
    requestAnimationFrame(render)
  }
  requestAnimationFrame(render)
}

let f = 0
function render_scene(gl, dt) {
  gl.fclear()

  f += Math.random() * 0.1

  /* Calculate light intensities */
  cabin_intensity = Math.sin(f)
  cabin_intensity *= cabin_intensity
  cabin_intensity = (cabin_intensity + 2) / 2
  boat_intensity = Math.sin(f)
  boat_intensity *= boat_intensity
  boat_intensity = (boat_intensity + 2) / 2

  /* Render the pier */
  pier_shader.activate()
  pier_shader.set_perspective_matrix(camera.perspective_matrix)
  pier_shader.set_camera_matrix(camera.modelview_matrix)
  pier_shader.set_lightpos([0, 10, 0])
  pier_shader.set_lightintensity(boat_intensity)
  pier.transform.position = [0, 2, 0]
  pier.transform.scale = [0.3, 0.3, 0.3]
  pier.pre_render()
  pier_shader.set_lightcolors(null, [1.0, 1.0, 0.6, 1.0], null)
  pier_shader.set_lightpos([10, 18, 41])
  pier_shader.render_model(pier)

  /* Render boat */
  boat_shader.activate()
  boat_shader.set_perspective_matrix(camera.perspective_matrix)
  boat_shader.set_camera_matrix(camera.modelview_matrix)
  boat_shader.set_lightpos([14, 16, 41])
  boat_shader.set_lightintensity(boat_intensity)
  boat.transform.position = [5, 13, 50]
  boat.transform.rotation = [0, 90, 0]
  boat.transform.scale = [1, 1, 1]
  boat.pre_render()
  boat_shader.set_lightcolors(null, null, null)
  boat_shader.render_model(boat)
  boat_shader.set_lightpos([14, 20, 41])
  boat_shader.render_model(boat)

  /* Render Cabin */
  cabin_shader.activate()
  cabin_shader.set_perspective_matrix(camera.perspective_matrix)
  cabin_shader.set_camera_matrix(camera.modelview_matrix)
  cabin.transform.position = [126, 21, 0]
  cabin.transform.rotation = [0, -90, 0]
  cabin.transform.scale = [0.7, 0.7, 0.7]
  cabin_shader.set_lightcolors(null, null, null)
  cabin_shader.set_lightpos([132, 40, -12])
  cabin_shader.set_lightintensity(cabin_intensity)
  cabin.pre_render()
  cabin_shader.render_model(cabin)

  /* Render candle */
  candle_shader.activate()
  candle_shader.set_perspective_matrix(camera.perspective_matrix)
  candle_shader.set_camera_matrix(camera.modelview_matrix)

  /* Boat candle */
  candle.transform.position = [9, 17.5, 44]
  candle.transform.scale = [0.1, 0.1, 0.1]
  candle_shader.set_lightcolors(null, null, null)
  candle_shader.set_lightpos([12, 20, 44])
  candle_shader.set_lightintensity(boat_intensity)
  candle.pre_render()
  candle_shader.render_model(candle)

  /* Inside candle */
  candle.transform.position = [132, 30.6, -12]
  candle.transform.scale = [0.1, 0.1, 0.1]
  candle_shader.set_lightcolors(null, null, null)
  candle_shader.set_lightpos([132, 32, -12])
  candle_shader.set_lightintensity(cabin_intensity)
  candle.pre_render()
  candle_shader.render_model(candle)

  /* Render Table */
  table_shader.activate()
  table_shader.set_perspective_matrix(camera.perspective_matrix)
  table_shader.set_camera_matrix(camera.modelview_matrix)
  table.transform.position = [132, 25, -12]
  table.transform.scale = [0.2, 0.2, 0.2]
  table.transform.rotation = [0, 90, 0]
  table_shader.set_lightcolors(null, null, null)
  table_shader.set_lightpos([132, 32, -12])
  table_shader.set_lightintensity(cabin_intensity)
  table.pre_render()
  table_shader.render_model(table)

  /* Render Grass */
  grass_shader.activate()
  grass_shader.set_perspective_matrix(camera.perspective_matrix)
  grass_shader.set_camera_matrix(camera.modelview_matrix)
  grass.transform.rotation = [90, 0, 0]
  grass.transform.scale = [48, 50, 1]
  grass.transform.position = [125, 23, 0]
  grass_shader.set_lightcolors(null, null, null)
  grass.pre_render()
  grass_shader.render_model(grass)

  /* Render Dirt */
  dirt_shader.activate()
  dirt_shader.set_perspective_matrix(camera.perspective_matrix)
  dirt_shader.set_camera_matrix(camera.modelview_matrix)
  dirt_shader.set_lightcolors(null, null, null)
  dirt.transform.position = [101, 13, 26]
  dirt.transform.scale = [50, 19, 50]
  dirt.pre_render()
  dirt_shader.render_model(dirt)

  dirt.transform.position = [151, 13, 26]
  dirt.transform.scale = [50, 19, 50]
  dirt.pre_render()
  dirt_shader.render_model(dirt)

  dirt.transform.position = [101, 13, -26]
  dirt.transform.scale = [50, 19, 53]
  dirt.pre_render()
  dirt_shader.render_model(dirt)

  dirt.transform.position = [151, 13, -26]
  dirt.transform.scale = [50, 19, 53]
  dirt.pre_render()
  dirt_shader.render_model(dirt)

  /* Set up skybox */
  sky_shader.activate()
  sky_shader.set_perspective_matrix(camera.perspective_matrix)
  sky_shader.set_camera_matrix(camera.modelview_matrix)
  sky_shader.set_lightcolors(null, null, null)
  sky_shader.render_skybox(skybox, camera)
}

let WAVE_FACTOR = 0
let WAVE_SPEED = 0.0003

function display(gl, dt) {
  camera.update_viewmatrix()
  WAVE_FACTOR += WAVE_SPEED
  WAVE_FACTOR %= 1

  /* Reflection pass */
  ocean_fb.bind_reflection_framebuffer()
  const distance = 2 * (camera.transform.position[1] - 13)
  camera.pitch = -camera.pitch
  camera.transform.position[1] -= distance
  camera.update_viewmatrix()
  render_scene(gl, dt)
  ocean_fb.unbind_current_framebuffer()

  /* Fix camera */
  camera.transform.position[1] += distance
  camera.pitch = -camera.pitch
  camera.update_viewmatrix()

  /* Render whole scene */
  render_scene(gl, dt)

  /* Render ocean */
  ocean_shader.activate()
  ocean_shader.set_perspective_matrix(camera.perspective_matrix)
  ocean_shader.set_camera_matrix(camera.modelview_matrix)
  ocean.transform.position = [0, 13, 0]
  ocean.transform.rotation = [0, 0, 0]
  ocean.transform.scale = [190, 1, 190]
  ocean_shader.set_lightcolors(null, null, null)
  ocean_shader.set_lightpos([[15, 18, 50]])
  ocean.pre_render()
  ocean_shader.ocean_reflection_texture = ocean_fb.reflection_texture
  ocean_shader.ocean_dudv_texture = ocean_fb.ocean_dudv_texture
  ocean_shader.render_ocean(ocean, WAVE_FACTOR)
}

window.onload = main
window.onresize = () => {
  gl !== null ? gl.fset_size(window.innerWidth, window.innerHeight) : {}
}
