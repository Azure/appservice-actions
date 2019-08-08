With GitHub AppService Actions you can automate your workflow to deploy Azure WebApps and Azure WebApp for Containers

## Azure web app action metadata file

The action.yml file contains metadata about the Azure web app action.  

```yaml
# File: action.yml

name: 'Azure WebApp'
description: 'Deploy Web Apps to Azure'
inputs: 
  app-name: # id of input
    description: 'Name of the Azure Web App'
    required: true
    # in the future we may add 'type', for now assume string
  package: # id of input
    description: 'Path to package or folder. *.zip, *.war, *.jar or a folder to deploy'
    required: true
  publish-profile: # id of input
    description: 'Publish profile (*.publishsettings) file contents with Web Deploy secrets'
    required: false
outputs:
  webapp-url: # id of output
    description: 'URL to work with your webapp'
branding:
  icon: 'webapp.svg' # vector art to display in the GitHub Marketplace
  color: 'blue' # optional, decorates the entry in the GitHub Marketplace
runs:
  using: 'node'
  main: 'main.js'
```

## Workflow file: deploy to Azure WebApp

```yaml

# File: .github/workflows/workflow.yml

on: push

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:

    - uses: azure/appservice-actions/webapp@master
      with: 
        app-name: <Your web app name>
        package: '<folder or zip or war or jar to deploy>'
        publish-profile-xml: '${{ secrets.<Name of secret with publish profile contents> }}'
      id: myapp-id    
      
```


## Azure web app for container action metadata file

The action.yml file contains metadata about the web app container action.  

```yaml
# File: action.yml
# Azure web app action for containers

name: 'Azure WebApp Container'
description: 'Deploy Container Web Apps to Azure'
inputs: 
  app-name: # id of input
    description: 'Name of the Azure Web App'
    required: true
    # in the future we may add 'type', for now assume string
  images: # id of input
    description: 'Specify the fully qualified container image(s) name. For example, 'myregistry.azurecr.io/nginx:latest' or 'python:3.7.2-alpine/'. For multi-container scenario multiple container image names can be provided (multi-line separated)'
    required: true
  configuration-file: # id of input
    description: 'Path of the Docker-Compose file. Should be a fully qualified path or relative to the default working directory. Required for multi-container scenario'
    required: false
  container-command: # id of input
    description: 'Enter the start up command. For ex. dotnet run or dotnet filename.dll'
    required: false
outputs:
  webapp-url: # id of output
    description: 'URL to work with your webapp'
branding:
  icon: 'container-webapp.svg' # vector art to display in the GitHub Marketplace
  color: 'blue' # optional, decorates the entry in the GitHub Marketplace
runs:
  using: 'node'
  main: '/container-webapp/main.js
  
```

## Workflow file: deploy to Azure WebApp for Containers

```yaml

# File: .github/workflows/workflow.yml

on: push

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:

    - uses: azure/appservice-actions/webapp-container@master
      with:
        app-name: '<Your web app name>'
        images: '<fully qualified image name with tag, if any>'
      id: webapp-id
      
```
## Container CI
[GitHub Actions for Containers](https://github.com/Azure/container-actions) contains Actions to [log in to a private container registry](https://docs.docker.com/engine/reference/commandline/login/) such as [Azure Container registry](https://azure.microsoft.com/en-us/services/container-registry/). Once login is done, the next set of actions in the workflow can perform tasks such as building, tagging and pushing containers.

# Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
