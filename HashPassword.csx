#!/usr/bin/env dotnet-script
#r "nuget: BCrypt.Net-Next, 4.0.3"

var password = "ShanbouraCodeNetOwner1992003#";
var hash = BCrypt.Net.BCrypt.HashPassword(password);
Console.WriteLine(hash);
