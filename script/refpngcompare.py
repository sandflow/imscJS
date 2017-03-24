import argparse
import subprocess
import os
import fnmatch
import re
import sys

parser = argparse.ArgumentParser()

parser.add_argument("ref_dir", help = "Path of the Reference directory")

parser.add_argument("render_dir", help = "Path of the Generated directory")

args = parser.parse_args()

for dir, dirs, files in os.walk(args.ref_dir):
    for file in files:
        reffile = os.path.join(dir, file)
        destdir = os.path.join(args.render_dir, os.path.relpath(dir, args.ref_dir))
        genfile = os.path.join(destdir, file)
        
        if not os.path.exists(genfile):
            print("File " + genfile + " does not exist")
            continue
            
        if fnmatch.fnmatch(file, '*.png'):
            try:
                subprocess.check_output(["compare", '-metric', 'mse', reffile, genfile, 'null:'], stderr=subprocess.STDOUT, universal_newlines=True)
            except subprocess.CalledProcessError as err:
                m = re.search('([^\(]+)\(([^\)]+)', err.output)
                r = float(m.group(2))
                if (r > 0.001) :
                    print(reffile + ": " + str(r))

#        elif not fnmatch.fnmatch(file, 'manifest.json'):
#            try:
#                subprocess.check_output(["diff", '-w', reffile, genfile], stderr=subprocess.STDOUT, universal_newlines=True)
#            except subprocess.CalledProcessError as err:
#                print(err.output)


