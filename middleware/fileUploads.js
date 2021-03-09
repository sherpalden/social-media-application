const Busboy = require('busboy');
const bl = require('bl');
const fs = require('fs');
const path = require('path');
const util = require('util');

const errObj = require('../error/errorHandler');

const parseFormData = (req, res, next) => {
    if(req.headers['content-type'].split(';')[0] != null 
        && req.headers['content-type'].split(';')[0].toLowerCase() == "multipart/form-data"){
        let busboy;
        try {
            busboy = new Busboy({headers: req.headers});
        } 
        catch(err) {
            return res.status(400).json({error: err});
        }
        req.files = req.files || {};
        busboy.on('file', (key, file, name, enc, mimetype) => {
            file.pipe(bl((err, d) => {
                if (err || !(d.length || name)) { return; }
                const fileExt = path.extname(name);
    			const filename = name.split('.')[0] + '-' + Date.now() + fileExt;
                const fileData = {
                    data: file.truncated ? null : d,
                    filename: filename || null,
                    encoding: enc,
                    mimetype: mimetype,
                    truncated: file.truncated,
                    size: file.truncated ? null : Buffer.byteLength(d, 'binary')
                };
                req.files[key] = req.files[key] || [];
                req.files[key].push(fileData);
            }));
        })
        busboy.on('field', (fieldname, val) => {
            // console.log(`${fieldname} = ${typeof(val)}`)
            req.body[fieldname] = val;
        });
        busboy.on('finish', (err) => {
            if (err) res.status(400).json({error: err});
            next();
        });
        req.pipe(busboy);
    }
    else {
        next();
    }
}

const processFileNames = (req, res, next) => {
    try {
        let images = [];
        let videos = [];
        if(req.files['files']){
            const files = req.files['files'];  
            files.forEach(file => {
                const fileExt = path.extname(file.filename);
                if(fileExt == '.jpeg' || fileExt == '.jpg' ||  fileExt == '.png' || fileExt == '.gif'){
                    images.push(file.filename);
                }
                if(fileExt == '.mp4' || fileExt == '.m4a' ||  fileExt == '.m4v' || fileExt == '.mov'){
                    videos.push(file.filename);
                }
            })
        }
        if(images != []){
            req.images = images;
        }
        if(videos != []){
            req.videos = videos;
        }
        next();
    }
    catch(err) {
        next(err)
    }
}

const uploadFiles = (folderPath)=> {
	return (req, res, next) => {
        if(req.files['files']){
    		const files = req.files['files'];
    		files.forEach(file => {
    			fs.open(`${folderPath}/${file.filename}`, 'w', (err, fd) => { 
    			    if(!err) {
    			        fs.write(fd, file.data, (err) => {
    			            if (err) return res.status(400).json({error: err}); 
    			        })
    			    }
    			})
    		})
        }
		next();
	}
}

const uploadSingleFile = (file, filePath) => {
    return new Promise((resolve, reject) => {
        fs.open(filePath, 'w', (err, fd) => { 
            if(!err) {
                fs.write(fd, file.data, (err) => {
                    if (!err) resolve();
                    else reject(err); 
                })
            }
            else reject(err);
        })
    })
}


module.exports = {
	parseFormData,
	processFileNames,
	uploadFiles,

    uploadSingleFile,
}