# GitHub Actions for deploying to Azure App Service

With the Azure App Service Actions for GitHub, you can automate your workflow to deploy [Azure Web Apps](https://azure.microsoft.com/en-us/services/app-service/web/) and [Azure Web Apps for Containers](https://azure.microsoft.com/en-us/services/app-service/containers/) using GitHub Actions.

Get started today with a [free Azure account](https://azure.com/free/open-source)!

The repository contains the following GitHub Actions:
* [Azure WebApp](https://github.com/Azure/appservice-actions/blob/master/webapp/action.yml): Deploy to Azure WebApp (Windows or Linux). Support deploying *.jar, *.war, *.zip or a folder.
* [Azure WebApp for Containers](https://github.com/Azure/appservice-actions/blob/master/webapp-container/action.yml): Deploy to Azure WebApp for Containers. Supports deploying a single container image or multiple containers.

End to end workflow samples shown below relies on following additional GitHub Actions

* [checkout](https://https://github.com/actions/checkout/blob/master/action.yml) 
* [Azure login](https://github.com/Azure/actions/blob/master/login/action.yml) Login to Azure using Azure Service Principal. Once login is done, the next set of Azure actions in the workflow can perform re-use the same session within the job
* [docker-login](https://github.com/Azure/container-actions/tree/master/docker-login) : Actions to [log in to a private container registry](https://docs.docker.com/engine/reference/commandline/login/) such as [Azure Container registry](https://azure.microsoft.com/en-us/services/container-registry/). Once login is done, the next set of Actions in the workflow can perform tasks such as building, tagging and pushing containers.


# Usage

Sample workflow to build and deploy Node.js app to Azure WebApp

### Deploy a Node.js app to Azure WebApp

```yaml

# File: .github/workflows/workflow.yml

on: push

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
    # checkout the repo
    - uses: actions/checkout@master
    
    # install dependencies, build, and test
    - name: npm install, build, and test
      run: |
        npm install
        npm run build --if-present
        npm run test --if-present
        
    # deploy web app using publish profile credentials
    - uses: azure/appservice-actions/webapp@master
      with: 
        app-name: node-rn
        publish-profile: ${{ secrets.azureWebAppPublishProfile }}
        

```

#### Configure deployment credentials:

For any credentials like Azure Service Principal, Publish Profile etc add them as [secrets](https://developer.github.com/actions/managing-workflows/storing-secrets/) in the GitHub repository and then use them in the workflow.

The above example uses app-level credentials i.e., publish profile file for deployment. 

Follow the steps to configure the secret:
  * Download the publish profile for the WebApp from the portal (Get Publish profile option)
  * Define a new secret under your repository settings, Add secret menu
  * Paste the contents for the downloaded publish profile file into the secret's value field
  * Now in the workflow file in your branch: `.github/workflows/workflow.yml` replace the secret for the input `publish-profile:` of the deploy Azure WebApp action (Refer to the example above)
    

### End to end workflow sample to build and deploy a Node.js app to Azure WebApp Container

```yaml

on: [push]

name: Node.js

jobs:

  build-and-deploy:
    name: Build
    runs-on: ubuntu-latest
    steps:

    - uses: actions/checkout@master
    
    - uses: azure/actions/login@master
      with:
        creds: ${{ secrets.AZURE_CREDENTIALS }}

    - uses: azure/k8s-actions/docker-login@master
      with:
        login-server: contoso.azurecr.io
        username: ${{ secrets.REGISTRY_USERNAME }}
        password: ${{ secrets.REGISTRY_PASSWORD }}
    
    - run: |
        docker build . -t contoso.azurecr.io/nodejssampleapp:${{ github.sha }}
        docker push contoso.azurecr.io/nodejssampleapp:${{ github.sha }} 
      
    - uses: azure/appservice-actions/webapp-container@master
      with:
        app-name: 'node-rnc'
        images: 'contoso.azurecr.io/nodejssampleapp:${{ github.sha }}'


```

#### Configure deployment credentials:

For any credentials like Azure Service Principal, Publish Profile etc add them as [secrets](https://developer.github.com/actions/managing-workflows/storing-secrets/) in the GitHub repository and then use them in the workflow.

The above example uses user-level credentials i.e., Azure Service Principal for deployment. 

Follow the steps to configure the secret:
  * Define a new secret under your repository settings, Add secret menu
  * Paste the contents of the below [az cli](https://docs.microsoft.com/en-us/cli/azure/?view=azure-cli-latest) command as the value of secret variable, for example 'AZURE_CREDENTIALS'
```bash  

   az ad sp create-for-rbac --name "myApp" --role contributor \
                            --scopes /subscriptions/{subscription-id}/resourceGroups/{resource-group} \
                            --sdk-auth
                            
  # Replace {subscription-id}, {resource-group} with the subscription, resource group details of the WebApp
```
  * Now in the workflow file in your branch: `.github/workflows/workflow.yml` replace the secret in Azure login action with your secret (Refer to the example above)
  * Similarly, define following additional secrets for the container registry credentials and set them in Docker login action
      * REGISTRY_USERNAME
      * REGISTRY_PASSWORD


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
