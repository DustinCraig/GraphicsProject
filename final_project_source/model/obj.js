import {cross, normalize} from '../math.js'

export async function LoadFile(path) {

    let text = ''
    await $.ajax({
        url: path,
        success: (data) => {
            text = data
        }
    })
    return text
}

function calculate_per_vertex_normals(vertices, indices) {
    let normals = []
    const x = 0
    const y = 1
    const z = 2

    for(let i = 0; i < vertices.length; i++) 
        normals[i] = 0

    for(let i = 0; i < indices.length; i+=3) {

        let p0 = []
        p0[0] = vertices[indices[i]*3 + x]
        p0[1] = vertices[indices[i]*3 + y]
        p0[2] = vertices[indices[i]*3 + z]

        let p1 = []
        p1[0] = vertices[indices[i+1]*3 + x]
        p1[1] = vertices[indices[i+1]*3 + y]
        p1[2] = vertices[indices[i+1]*3 + z]

        let p2 = []
        p2[0] = vertices[indices[i+2]*3 + x]
        p2[1] = vertices[indices[i+2]*3 + y]
        p2[2] = vertices[indices[i+2]*3 + z]

        let v1 = []
        let v2 = []

        v1[x] = p1[0] - p0[0]
        v1[y] = p1[1] - p0[1]
        v1[z] = p1[2] - p0[2]

        v2[x] = p2[0] - p0[0]
        v2[y] = p2[1] - p0[1]
        v2[z] = p2[2] - p0[2]

        let normal = cross(v1, v2)
        normal = normalize(normal)

        normals[indices[i]*3 + x] += normal[x]
        normals[indices[i]*3 + y] += normal[y]
        normals[indices[i]*3 + z] += normal[z]
            
        normals[indices[i+1]*3 + x] += normal[x]
        normals[indices[i+1]*3 + y] += normal[y]
        normals[indices[i+1]*3 + z] += normal[z]

        normals[indices[i+2]*3 + x] += normal[x]
        normals[indices[i+2]*3 + y] += normal[y]
        normals[indices[i+2]*3 + z] += normal[z]

    }

    /* Normalize the normal array */
    for(let i = 0; i < normals.length; i += 3) {
        const length = Math.sqrt(normals[i]*normals[i] + normals[i+1]*normals[i+1] + normals[i+2]*normals[i+2])
        if(length === 0) continue
        normals[i + x] = normals[i + x] / length 
        normals[i + y] = normals[i + y] / length 
        normals[i + z] = normals[i + z] / length
    }  

    return normals
}

export function load_mesh(txt) {
    txt = txt.trim() + '\n'

    let line, item = ''


    let raw_verts =   []
    let raw_tex   =   []
    let raw_indices = []
    let final_verts = []
    let indices     = []
    let final_tex   = []
    let final_norms = []
    let a_cache     = []
    let index_count = 0
    let quad = false 

    let posA = 0
    let posB = txt.indexOf('\n', 0)
    while(posB > posA) {
        line = txt.substring(posA, posB).trim()
 
        switch(line.charAt(0)) {
            
            /* We are handling vertex data */
            case 'v':
                
                item = line.split(' ')
                item.shift()
                /* Remove extra spaces in vertex list */
                while(item.length > 3) item.shift()
                switch(line.charAt(1)) {
                    case ' ': raw_verts.push(parseFloat(item[0]), parseFloat(item[1]), parseFloat(item[2])); break 
                    case 't': raw_tex.push(parseFloat(item[0]), parseFloat(item[1])); break  
                }
            break 
            
            /* Process face data */
            case 'f':
                item = line.split(' ')
                item.shift()
                quad = false 
                for(let i = 0; i < item.length; i++) {

                    if(i == 3 && !quad) {
                        i = 2 
                        quad = true 
                    }
                    let ary = item[i].split('/')
                    raw_indices.push(parseInt(ary[0])-1)
                    if(item[i] in a_cache) {
                        indices.push(a_cache[item[i]])
                    } else {
                        /* New unique vertex */
                        
                        
                        /* Parse vertex data */
                        const ind = (parseInt(ary[0])-1) * 3
                        final_verts.push(raw_verts[ind], raw_verts[ind+1], raw_verts[ind+2])

                        /* Parse texture data if there */
                        if(ary[1] != '') {
                            const tind = (parseInt(ary[1])-1) * 2
                            final_tex.push(raw_tex[tind], 1-raw_tex[tind+1])
                        }

                        a_cache[item[i]] = index_count
                        indices.push(index_count)
                        index_count++
                    }

                    if(i == 3 && quad) indices.push(a_cache[item[0]])
                }
            break 
        }
        posA = posB+1
        posB = txt.indexOf('\n', posA)
    }
    final_norms = calculate_per_vertex_normals(final_verts, indices)
    return [indices, final_verts, final_norms, final_tex]
}