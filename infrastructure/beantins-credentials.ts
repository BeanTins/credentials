import {UserPool, 
  AccountRecovery, 
  UserPoolClient, 
  UserPoolClientIdentityProvider, 
  ClientAttributes, 
  ResourceServerScope, 
  OAuthScope,
  UserPoolResourceServer} from "aws-cdk-lib/aws-cognito"
import {Stack, App, StackProps, RemovalPolicy, CfnOutput} from "aws-cdk-lib"
import {StringParameter, ParameterType, ParameterTier} from "aws-cdk-lib/aws-ssm"

export enum StoreType
{
  Output,
  Parameter
}
interface BeanTinsCredentialsProps extends StackProps {
  stageName: string
  storeTypeForSettings: StoreType
}

export class BeanTinsCredentials extends Stack {
  public readonly userPoolId: string
  public readonly userPoolMemberClientId: string
  public readonly userPoolAdminClientId: string
  public readonly userPoolArn: string
  private userServer: UserPoolResourceServer

  constructor(scope: App, id: string, props: BeanTinsCredentialsProps) {
    super(scope, id, props)

    const userPool = this.buildUserPool(id, props.stageName, props.storeTypeForSettings)
    this.userPoolId = userPool.userPoolId
    this.userPoolArn = userPool.userPoolArn

    const memberScope = new ResourceServerScope({ scopeName: "member", scopeDescription: "member access to the BeanTins service" })
    const adminScope = new ResourceServerScope({ scopeName: "admin", scopeDescription: "admin access to the BeanTins service" })

    this.userServer = userPool.addResourceServer("ResourceServer", {
     identifier: "beantinsusers",
     scopes: [ memberScope, adminScope ],
    })

    this.userServer.userPoolResourceServerId

    const memberClient = this.buildUserPoolClient("Member", userPool, props.stageName, props.storeTypeForSettings, memberScope)
    this.userPoolMemberClientId = memberClient.userPoolClientId

    const adminClient = this.buildUserPoolClient("Admin", userPool, props.stageName, props.storeTypeForSettings, adminScope)
    this.userPoolAdminClientId = adminClient.userPoolClientId

  }

  private buildUserPool(id: string, stageName: string, storeType: StoreType) {
    const userPool = new UserPool(this, "BeanTinsCredentials" + stageName, {
      selfSignUpEnabled: true,
      // signInAliases: {
      //   email: true,
      // },
      // autoVerify: {
      //   email: false,
      // },

      passwordPolicy: {
        minLength: 6,
        requireLowercase: true,
        requireDigits: true,
        requireUppercase: false,
        requireSymbols: false,
      },
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      removalPolicy: RemovalPolicy.DESTROY,
    })

    this.storeSetting("UserPoolId" + stageName, 
                        "the member credentials Id for stage environment " + stageName,
                        userPool.userPoolId,
                        storeType)

    this.storeSetting("UserPoolArn" + stageName, 
                        "the member credentials Arn for stage environment " + stageName,
                        userPool.userPoolArn,
                        storeType)

    return userPool
  }

  private storeSetting(name: string, description: string, value: string, storeType: StoreType) {
    if (storeType == StoreType.Parameter)
    {
      this.buildParameter(name, description, value)
    }
    else
    {
      new CfnOutput(this, name, {
        description: description,
        value: value,
        exportName: name
      })
    }
  }

  private buildParameter(name: string, description: string, value: string) {

    return new StringParameter(this, name, {
      parameterName: name,
      stringValue: value,
      description: description,
      type: ParameterType.STRING,
      tier: ParameterTier.STANDARD,
      allowedPattern: ".*",
    })
  }

  private buildUserPoolClient(name: string, userPool: UserPool, stageName: string, storeType: StoreType, scope: ResourceServerScope) {
    const standardCognitoAttributes = {
      email: true,
      emailVerified: true,
      locale: true,
      timezone: true,
      lastUpdateTime: true
    }
  
    const clientReadAttributes = new ClientAttributes()
      .withStandardAttributes(standardCognitoAttributes)
  
    const clientWriteAttributes = new ClientAttributes()
      .withStandardAttributes({
        ...standardCognitoAttributes,
        emailVerified: false,
      })
  
    const userPoolClient = new UserPoolClient(this, name + "CredentialsClient", {
      userPool,
      authFlows: {
        adminUserPassword: true,
        custom: true,
        userSrp: true,
      },
      oAuth: {
        scopes: [ OAuthScope.resourceServer(this.userServer, scope) ],
      },
      supportedIdentityProviders: [
        UserPoolClientIdentityProvider.COGNITO,
      ],
      readAttributes: clientReadAttributes,
      writeAttributes: clientWriteAttributes,
    })
  
    this.storeSetting("UserPool" + name + "ClientId" + stageName, 
                      "the " + name + " credentials client Id for stage environment " + stageName,
                      userPoolClient.userPoolClientId,
                      storeType)

                      this.storeSetting("UserPool" + name + "ClientScope" + stageName, 
                      "the " + name + " client scope for oauth for stage environment " + stageName,
                      this.userServer.userPoolResourceServerId + "/" + scope.scopeName,
                      storeType)

    return userPoolClient
  }

}
