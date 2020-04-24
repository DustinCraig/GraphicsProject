/* Transform a vector by a 4d vector and a mat4 */
function transform_vec4(out, v, m) {
    out[0] = m[0] * v[0] + m[4] * v[1] + m[8]	* v[2] + m[12] * v[3]
	out[1] = m[1] * v[0] + m[5] * v[1] + m[9]	* v[2] + m[13] * v[3]
	out[2] = m[2] * v[0] + m[6] * v[1] + m[10]	* v[2] + m[14] * v[3]
	out[3] = m[3] * v[0] + m[7] * v[1] + m[11]	* v[2] + m[15] * v[3]
	return out
}

export class Transform {

    constructor() {
        this._position = vec3.create()
        this._scale    = vec3.create() 
        this._rotation = vec3.create() /* Rotation value is based on degrees */

        vec3.set(this._scale, 1, 1, 1)
        
        this._up      = vec4.create()
        this._right   = vec4.create()
        this._forward = vec4.create()

        this._view_matrix = mat4.create()

        this._deg_to_rad = Math.PI / 180
    }

    /* Update the view model matrix and the direction vectors */
    update_matrix() {
        /* Reset the view matrix to the identity */
        mat4.identity(this._view_matrix)

         
        
        /* Translate and then rotate */
        mat4.translate(this._view_matrix, this._view_matrix, this._position)
        mat4.rotateX(this._view_matrix, this._view_matrix, this._rotation[0] * this._deg_to_rad)
        mat4.rotateY(this._view_matrix, this._view_matrix, this._rotation[1] * this._deg_to_rad)
        mat4.rotateZ(this._view_matrix, this._view_matrix, this._rotation[2] * this._deg_to_rad)
        mat4.scale(this._view_matrix, this._view_matrix, this._scale)
        /*****************************/

        /* Update direction */
        transform_vec4(this._forward, [0,0,1,0], this._view_matrix)
        transform_vec4(this._up, [0,1,0,0], this._view_matrix)
        transform_vec4(this._right, [1,0,0,0], this._view_matrix)
        /********************/
       
    }

    /* Update only the direction vectors */
    update_direction() {
        this._forward[0] = this._view_matrix[8]
        this._forward[1] = this._view_matrix[9]
        this._forward[2] = this._view_matrix[10]

        this._right[0] = this._view_matrix[0]
        this._right[1] = this._view_matrix[1]
        this._right[2] = this._view_matrix[2]

        this._up[0] = this._view_matrix[4]
        this._up[1] = this._view_matrix[5]
        this._up[2] = this._view_matrix[6]

        // transform_vec4(this._forward, [0,0,1,0], this._view_matrix)
        //transform_vec4(this._up, [0,1,0,0], this._view_matrix)
        //transform_vec4(this._right, [1,0,0,0], this._view_matrix)
    }

    reset_viewmatrix() {
        this._view_matrix = mat4.create()
        return this._view_matrix
    }

    get view_matrix() {
        return this._view_matrix
    }
    
    get position() {
        return this._position
    }
    set position(pos) {
        vec3.set(this._position, pos[0], pos[1], pos[2])
    }

    get rotation() {
        return this._rotation
    }
    set rotation(rot) {
        vec3.set(this._rotation, rot[0], rot[1], rot[2])
    }

    get scale() {
        return this._scale
    }
    set scale(s) {
        vec3.set(this._scale, s[0], s[1], s[2])
    }

    get right() {
        return this._right
    }
    set right(r) {
        vec3.set(this._right, r[0], r[1], r[2])
    }

    get forward() {
        return this._forward
    }
    set forward(f) {
        vec3.set(this._forward, f[0], f[1], f[2])
    }

    get up() {
        return this._up
    }
    set up(u) {
        vec3.set(this._up, u[0], u[1], u[2])
    }

}