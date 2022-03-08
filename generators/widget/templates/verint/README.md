This folder, 'verint' contains file structure that mimics verint root directory. This is done 
for the future usage with virtual machine or a Docker container, where we can map this folder to 
a real Verint one and develop more easily w/o the need to upload packages all the time.

Inside we have 
first important folder, 'filestorage', where Verint stores all its files.

Next, we have these folders:

* `defaultwidgets` is the folder where regular instance widgets are stored - the widgets that could
be found and edited with Widget Studio in admin console. Custom widgets that you can create with 
  Widget Studio command are also stored here.
  * `{providerId}` folder - for common case it's 32 zeros, because usually we don't have a 
    provider Id. 
  
So the regular address for common custom widgets is 
```
/filestorage/defaultwidgets/{providerId}/
```
There we have 1 file and (optionally) 1 folder for each widget:

* `{instanceId}.xml` - file that has similar structure with Widget Studio's import/export, only 
this file doesn't have attachments as base64, only 5 main files and widget metadata. **This file 
is a main definition of a widget in this git project.** If you want to change some metadata - 
  you should edit this `{instanceId}.xml` file.  
* `[{instanceId}]` - a folder that contains attachments. This folder can be absent, if a widget has 
no attachments. **Attachments that are not built by build scripts should be stored here for 
version-control and editing.** Attachments that are built by scripts have to be named vendor-
  {something} - in this way they're git-ignored.
