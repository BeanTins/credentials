
import "source-map-support/register"
import {App} from "aws-cdk-lib"
import { BeanTinsCredentials, StoreType } from "../infrastructure/beantins-credentials"

const app = new App()
new BeanTinsCredentials(app, "BeanTinsCredentialsProd", {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  stageName: "prod",
  storeTypeForSettings: StoreType.Parameter
})

app.synth()