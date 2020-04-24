import {Transform} from '../transform.js'
import {Mesh} from './mesh.js'

let skybox_verts = [
    -1, -1,
    1, -1,
   -1,  1,
   -1,  1,
    1, -1,
    1,  1,
]

export class Model {
    
    constructor(gl, name, mesh_data=null) {
        this.transform = new Transform()
        this.mesh = new Mesh(gl)

        if(mesh_data !== null) {
            mesh_data.unshift(name)
            this.mesh.vao = this.mesh.create_vao(...mesh_data)
        }

        if(name === 'skybox')     
            this.mesh.vao = this.mesh.create_vao('skybox', null, skybox_verts)

    }

    pre_render() {
        this.transform.update_matrix()
    }
}