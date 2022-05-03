This folder, 'verint' contains file structure that mimics verint root directory.
This is done for the future usage with virtual machine or a Docker container,
where we can map this folder to a real Verint one and develop more easily w/o
the need to upload packages all the time.

Inside we have
first important folder, 'filestorage', where Verint stores all its files.

Next, we have these folders:

* `embeddables/fd` is the folder where regular instance embeddables are
  stored -
  the embeddables that could be found and edited with Embeddable Studio in
  admin console. Custom embeddables that you can create with Embeddable
  Studio command are also stored here.
    * `{providerId}` folder - for common case it's 32 zeros, because usually we
      don't have a provider Id.

So the regular address for common custom embeddables is
```
/filestorage/embeddables/fd/{providerId}/
```
There we have 1 file and (optionally) 1 folder for each embeddable:

* `{instanceId}.xml` - file that has similar structure with Embeddable Studio's
  import/export, only this file doesn't have attachments as base64, only 3 main
  files and embeddable metadata. **This file is a main definition of an embeddable
  in this git project.** If you want to change some metadata - you should edit
  this `{instanceId}.xml` file.
* `[{instanceId}]` - a folder that contains attachments. This folder can be
  absent, if an embeddable has no attachments. **Attachments that are not built
  by build scripts should be stored here for version-control and editing.**
  Attachments that are built by scripts have to be named `bundle-{something}` -
  in this way they're git-ignored.
