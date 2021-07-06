#!/bin/sh

git clone https://github.com/littleboycoding/fire

cd fire && make

rm -rf ../bin

mkdir ../bin

cp -p dist/* ../bin

rm -rf ../fire