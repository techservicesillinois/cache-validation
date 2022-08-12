# cache-validation

This action allows cache objects to be validated using MD5 checksums.

[![tests](https://github.com/techservicesillinois/cache-validation/actions/workflows/tests.yml/badge.svg)](https://github.com/techservicesillinois/cache-validation/actions/workflows/tests.yml)

This action is supported by the Cybersecurity Development team at
the University of Illinois, on a best-effort basis. As of the last
update to this README, the expected End-of-Life and End-of-Support
date of this version is April 2023, the same as its sole dependency
[Node.js 14](https://nodejs.org/en/about/releases/).

## Usage

This action is designed to be used with the [cache
action](https://github.com/actions/cache/blob/main/README.md) to
provide validation. Below is a simple example:

```yaml
  - name: Cache Python site-package
    uses: actions/cache@v2
    id: python
    with:
      path: |
          ${{ env.pythonLocation}}/bin
          ${{ env.pythonLocation}}/lib/python3.9/site-packages
      key: ${{ runner.os }}-python

    - name: Validate Python site-package
      uses: techservicesillinois/cache-validation@v1
      id: cache
      with:
        path: |
            ${{ env.pythonLocation}}/bin
            ${{ env.pythonLocation}}/lib/python3.9/site-packages
        cache_hit: ${{ steps.python.outputs.cache-hit }}

    - name: Upgrade pip
      if: steps.cache.outputs.valid != 'true'
      run: python -m pip install --upgrade --upgrade-strategy eager pip
```

The action works by taking a list of paths, and on a cache miss
generating a MD5SUMS file in each given directory after all steps
have executed. The MD5SUMS file contains a hash and path to every
file found recursively in the directory.

On a cache hit the action uses the MD5SUMS files to verify the
contents of each directory at the time and place where it is invocated
in the yaml file. If files are missing or invalid then the output
`valid` is set to `false`. If `fatal` is set to `true` then the
action will return `1` which will cause the pipeline to fail,
otherwise `0` is always returned so that the workflow can recover
from the corrupted cache by rebuilding its contents.

## Inputs/Outputs

See [action.yml](action.yml).
