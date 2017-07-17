import argparse
import subprocess
import os
import fnmatch
import re
import sys

parser = argparse.ArgumentParser()

parser.add_argument("ref_dir", help = "Path of the Reference directory")

parser.add_argument("render_dir", help = "Path of the Generated directory")

parser.add_argument("-d", help = "Specifies whether a diff of images is output")

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
                if (r > 0.0001) :
                    print(reffile + ": " + str(r))
                    if args.d is not None:
                      diffdir = args.d
                      #diffdir = os.path.join(args.d, os.path.relpath(dir, args.ref_dir))
                      if not os.path.exists(diffdir):
                        os.makedirs(diffdir)
                      difffile = os.path.join(args.d, os.path.relpath(dir, args.ref_dir) + "-" + file)
                      p1 = subprocess.Popen(["compare", reffile, genfile, "png:-"], stdout=subprocess.PIPE)
                      p2 = subprocess.Popen(["montage", "-mode", "concatenate", reffile, "-", genfile, difffile], stdin=p1.stdout)
                      p1.stdout.close()
                      p2.communicate()


#        elif not fnmatch.fnmatch(file, 'manifest.json'):
#            try:
#                subprocess.check_output(["diff", '-w', reffile, genfile], stderr=subprocess.STDOUT, universal_newlines=True)
#            except subprocess.CalledProcessError as err:
#                print(err.output)


