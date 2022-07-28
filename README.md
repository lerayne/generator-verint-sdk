# generator-verint-sdk

A yeoman generator for creating custom extensions for Verint (ex-Telligent) 
platform.

This includes: 
* widgets (available now)
* themes (in progress)
* embeddables (only for Verint 12, in progress)
* automations (possible, work postponed)

## Prerequisites

* **git**
* **node** 12.22.10 or later
* **npm** 6.14.16 or later
* **yo** (yeoman) 4.3.0 installed globally. 

It may run on earlier versions of node, npm and yeoman, but proper 
functioning is not guaranteed

## Installation

Install this package globally:  
`npm install -g generator-verint-sdk`

## Usage

### Widgets

#### Scaffolding a project

Run `yo verint-sdk:widget` in the folder of the project. 

Usually it's assumed that you have this folder under git version control, for 
example you created a bitbucket repository for your new project and cloned it 
to your PC.

You will be prompted with a series of questions. There are several main 
scenarios of the widget creation/conversion depending on your choices:

* Create a new widget project from scratch
  * Simple widget project
  * React widget project
* Create a new simple widget project from existing XML
* Add a widget to an existing project
  * Add React widget to a React widget project
  * Add simple widget to a React widget project
  * Add simple widget to a simple widget project

You can't:
* Convert an existing XML to a React project
* Add React widget to a project with simple widget(s)
* Create a new project in the folder with an existing project created by 
  this generator. Corresponding prompt options will be disabled.

Also, following questions can be asked depending on your choices:
* What Verint platform to use (11 or 12)
* Project name
* User name (default is being read from your git setting)
* User email (default is being read from your git setting)
* A human-readable widget name
* A selection of standard Verint widget files (for example you can choose 
  not to create headerScript.vm if your widget doesn't need it)
* Widget description
* Caching and other flags
* CSS class name for the widget

You can also be asked if you want to overwrite some existing files (for 
example in "Create a new widget project from existing XML" scenario you 
could already have a .gitignore file in your project.) Usually the correct 
answer is "overwrite all".

By the end of the process you can expect to have a complete file system 
scaffold including installed node_modules folder.

#### Using a created scaffold

Currently, there are 3 possible build commands available:  
For simple widget(s) project 
* `npm run build-simple` creates a bundle XML in "distrib" folder  

For React widget(s) project
* `npm run build-dev` creates bundle XML in "distrib" folder with source 
  maps and other perks for development
* `npm run build-prod` creates production-grade bundle XML in "distrib" folder 
