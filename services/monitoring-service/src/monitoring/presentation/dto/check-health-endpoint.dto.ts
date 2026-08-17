import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class CheckHealthEndpointDto {
  @IsString()
  @IsNotEmpty()
  @IsUrl({
    require_tld: false,
    protocols: ['http', 'https'],
    require_protocol: true,
  })
  url!: string;
}
