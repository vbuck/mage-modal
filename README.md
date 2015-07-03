# MageModal
A modal drop-in module for admin and frontend Magento development.
---

MageModal is a modal UI library for Magento written in JavaScript that
you can quickly start using for your admin or frontend projects. Start
thinking "outside the page" to enhance the user experience.

## How to Use
Most of what you need to get started can be found on my blog:

> [http://blog.rickbuczynski.com/magento/magemodal/]

## How to Install
Also found on the blog post, but to re-state:

**Manually extracting from an archive**

**Modman**
```
modman clone https://github.com/vbuck/mage-modal.git
```

**Composer**
```
{
    "require" : {
        "vbuck/mage-modal" : "1.0.0"
    },
    "repositories" : [
        {
            "type" : "vcs",
            "url"  : "https://github.com/vbuck/mage-modal.git"
        }
    ]
}
```

Once installed, you can toggle its use via `System > Configuration >
Developer > MageModal`. By default it is enabled for admin, disabled
for frontend use.

## License
The MIT License (MIT)

Copyright (c) 2015 Rick Buczynski

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
