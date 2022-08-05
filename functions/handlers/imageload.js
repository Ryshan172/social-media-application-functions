//This is an attempt at creating a method for uploading images
//It will be based on all the code in the posts.js file and associated..
//..code for post functions

const { db } = require("../util/admin");

exports.getAllImageLoads = (req, res) => {
  db.collection("imageloads") //instead of admin.firestore//
    .orderBy("createdAt", "desc")
    .get()
    .then((data) => {
      let imageloads = [];
      data.forEach((doc) => {
        imageloads.push({
          imageloadId: doc.id,
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt,
          commentCount: doc.data().commentCount,
          likeCount: doc.data().likeCount,
          userImage: doc.data().userImage,
        });
      });
      return res.json(imageloads);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

exports.postOneImage = (req, res) => {
  if (req.body.body === "") {
    return res.status(400).json({ body: "Body must not be empty" });
  }

  const newImageLoad = {
    body: req.body.body,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0,
  };

  db.collection("imageloads")
    .add(newImageLoad)
    .then((doc) => {
      const resImageLoad = newImageLoad;
      resImageLoad.imageloadId = doc.id;
      res.json({ message: `document ${doc.id} created successfully` });
    })
    .catch((err) => {
      res.status(500).json({ error: "something went wrong" });
      console.error(err);
    });
};

//Creating getPost function//
exports.getImageLoad = (req, res) => {
  let imageLoadData = {};
  db.doc(`/imageloads/${req.params.imageloadId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Post not found" });
      }
      imageLoadData = doc.data();
      imageLoadData.imageloadId = doc.id;
      return db
        .collection("comments")
        .orderBy("createdAt", "desc")
        .where("imageloadId", "==", req.params.imageloadId)
        .get();
    })
    .then((data) => {
      imageLoadData.comments = [];
      data.forEach((doc) => {
        imageLoadData.comments.push(doc.data());
      });
      return res.json(imageLoadData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

//Comment on a Post//
exports.commentOnImageLoad = (req, res) => {
  if (req.body.body.trim() === "")
    return res.status(400).json({ comment: "Must not be empty" });

  const newComment = {
    body: req.body.body,
    createdAt: new Date().toISOString(),
    imageloadId: req.params.imageloadId,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl,
  };

  db.doc(`/imageloads/${req.params.postId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Post not found" });
      }
      return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
    })
    .then(() => {
      return db.collection("comments").add(newComment);
    })
    .then(() => {
      res.json(newComment);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: "Something went wrong" });
    });
};

//Liking a post
exports.likeImageLoad = (req, res) => {
  const likeDocument = db
    .collection("likes")
    .where("userHandle", "==", req.user.handle)
    .where("imageloadId", "==", req.params.imageloadId)
    .limit(1);

  const postDocument = db.doc(`/imageloads/${req.params.postId}`);

  let imageLoadData;

  postDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        imageLoadData = doc.data();
        imageLoadData.imageloadId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(404).json({ error: "Post not found" });
      }
    })
    .then((data) => {
      if (data.empty) {
        return db
          .collection("likes")
          .add({
            postId: req.params.imageloadId,
            userHandle: req.user.handle,
          })
          .then(() => {
            postData.likeCount++;
            return postDocument.update({ likeCount: imageLoadData.likeCount });
          })
          .then(() => {
            return res.json(imageLoadData);
          });
      } else {
        return res.status(400).json({ error: "Post already liked" });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

//Unliking a post//
exports.unlikeImageLoad = (req, res) => {
  const likeDocument = db
    .collection("likes")
    .where("userHandle", "==", req.user.handle)
    .where("postId", "==", req.params.imageloadId)
    .limit(1);

  const postDocument = db.doc(`/imageloads/${req.params.imageloadId}`);

  let imageLoadData;

  postDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        imageLoadData = doc.data();
        imageLoadData.imageloadId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(404).json({ error: "Post not found" });
      }
    })
    .then((data) => {
      if (data.empty) {
        return res.status(400).json({ error: "Post not liked" });
      } else {
        return db
          .doc(`/likes/${data.docs[0].id}`)
          .delete()
          .then(() => {
            imageLoadData.likeCount--;
            return postDocument.update({ likeCount: imageLoadData.likeCount });
          })
          .then(() => {
            res.json(imageLoadData);
          });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

//Delete a ImageLoad/
exports.deleteImageLoad = (req, res) => {
  const document = db.doc(`/imageloads/${req.params.imageloadId}`);
  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Post not found" });
      }
      if (doc.data().userHandle !== req.user.handle) {
        return res.status(403).json({ error: "Unauthorized" });
      } else {
        return document.delete();
      }
    })
    .then(() => {
      res.json({ message: "Post deleted successfully" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

//Method for actually placing an image in the body of the imageload
//Function for uploading images, is imported in Idex.js//
exports.uploadImageImageLoad = (req, res) => {
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new BusBoy({ headers: req.headers });

  let imageFileName;
  let imageToBeUploaded = {};

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
      return res.status(400).json({ error: "Wrong file type submitted" });
    }

    //gives us the index of the last item, e.g .png//
    const imageExtension = filename.split(".")[filename.split(".").length - 1];

    imageFileName = `${Math.round(
      Math.random() * 100000000000
    )}.${imageExtension}`;
    const filepath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = { filepath, mimetype };
    file.pipe(fs.createWriteStream(filepath));
  });
  busboy.on("finish", () => {
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype,
          },
        },
      })
      .then(() => {
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
        //attaching image to user's documents//
        return db.doc(`/imageloads/${req.params.imageloadId}`).update({ body });
      })
      .then(() => {
        return res.json({ message: "Image uploaded successfully" });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: error.code });
      });
  });
  busboy.end(req.rawBody);
};
